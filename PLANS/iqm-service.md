# iqm_service — Implementation Plan v1

**Scope:** a standalone, Dockerized microservice, `iqm_service/` (sibling to `video_service/`, `notebook_service/`, `backend/`, `frontend/`), that owns the IQM Resonance integration for QRoute — solving the dependency conflict documented in [PLANS/qroute.md](./qroute.md) §2.3/§6, where `qiskit-iqm` hard-pins `qiskit<1.3` and directly breaks `qiskit-ibm-runtime`/`qiskit-ionq` (which need `qiskit>=2.0`) when installed into the same `backend/` venv — confirmed by actually trying it during that build.

**Why this shape, not another one:** this repo has already solved "a dependency needs isolating from `backend/`'s shared venv" twice — `video_service/` (Playwright/ffmpeg/edge-tts, plus the original torch/CUDA OOM incident that's still documented at the top of `backend/requirements.txt`) and `notebook_service/` (a live Jupyter kernel process, deliberately kept out of `backend/` so a runaway user cell can't touch the main API process). Both are separate deployables with their own `requirements.txt`, `Dockerfile`, `docker-compose.yml`, and `.env`, talking to `backend/` over plain HTTP with a shared-secret header — not a shared Python environment, not a subprocess, not a plugin system. `iqm_service` follows the exact same shape. The qiskit-version conflict is a different *kind* of dependency problem than video_service's (a major-version split within the same ecosystem, not an unrelated heavy package), but the fix is identical: give it its own process and its own venv, and it stops mattering what qiskit version it needs.

---

## 0. Why REST-trigger, not the WebSocket pattern

Two existing precedents, two different shapes:
- `video_service`: stateless, `POST /internal/video-overview` triggers a render, does the work, returns a result. No persistent connection.
- `notebook_service`: a live `WS /ws/session` — necessary because a Jupyter kernel is a long-running process a student interacts with turn-by-turn.

IQM job submission is request/response, like every other QRoute provider adapter (`submit_job` → `get_job_result`, polled) — there's no live session to hold open. `iqm_service` follows `video_service`'s shape: a small stateless FastAPI app, no MongoDB connection of its own (same reasoning `notebook_service/main.py`'s own doc already gives for why *it* doesn't touch Mongo — this service has nothing to persist either; `backend/`'s `quantum_hw_jobs` collection remains the single source of truth for job records, `iqm_service` is purely a translator to and from the real IQM Resonance API).

---

## 1. `iqm_service/` — the service itself

```
iqm_service/
├── main.py            # FastAPI app — 4 endpoints, all internal-secret-gated except /health
├── iqm_client.py       # thin wrapper: qasm -> IQM native circuit -> submit -> poll -> counts
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env                # IQM_TOKEN (the REAL Resonance credential) + IQM_SERVICE_SECRET
└── .env.example
```

### `main.py` — endpoints

Deliberately shaped to mirror `QuantumProviderAdapter` (`backend/services/quantum_providers/base.py`) 1:1, so the backend-side adapter that calls this service is a thin HTTP shim, not new logic:

```
GET  /health                                    -> {"status": "healthy"}   (no auth)
GET  /devices                                   -> [DeviceInfo, ...]        (minus "provider" — backend adds that)
POST /jobs            {qasm, device_id, shots}  -> {"provider_job_id": str}
GET  /jobs/{provider_job_id}?device_id=...      -> JobResult                (minus cost/estimated_cost — Resonance
                                                                              has no documented cost API the way
                                                                              qBraid does; both stay None)
```

Every route but `/health` requires `X-Internal-Secret: <IQM_SERVICE_SECRET>`, checked exactly like `video_service/main.py:34-39` checks `RENDER_SERVICE_SECRET` — same header name, same 401-on-mismatch behavior, same env var naming convention (`IQM_SERVICE_SECRET`, matching the existing `RENDER_SERVICE_SECRET`/`QBOOK_SERVICE_SECRET` pair already in `backend/.env`).

### `iqm_client.py` — the actual IQM work

- **Auth:** `IQMProvider(url, token=os.getenv("IQM_TOKEN"))` — this is the ONE place in the whole system that ever imports `qiskit_iqm` or touches an IQM-flavored `qiskit`. Nothing outside this container ever needs to know IQM's SDK requires an older qiskit line.
- **Device listing:** curated list (same judgement call `qbraid_service.py`'s `_CURATED_DEVICE_IDS` and `ionq_adapter.py`'s already make) — needs a real Resonance account check to confirm actual device names (`garnet`/`emerald` were named in earlier research but not verified against a live account; flagged as this plan's one remaining unknown, same as the original IQM section's spike caveat, just now safely scoped to a throwaway container instead of `backend/`'s shared venv).
- **Submit:** `qiskit.qasm2.loads(qasm)` → `transpile_to_IQM(circuit, backend)` (IQM's own transpile helper — needed because IQM's native gate set differs from IBM's, same note the original plan already made) → `backend.run(circuit, shots=shots)`.
- **Status/result:** poll the job, map IQM's status strings onto the same 4-value `queued`/`running`/`completed`/`failed` set every other adapter uses (`_STATUS_MAP`-style, matching the convention in `qbraid_service.py`, `ionq_adapter.py`, `ibm_adapter.py`).

### `requirements.txt`

```
fastapi
uvicorn[standard]
python-dotenv
qiskit-iqm          # drags in qiskit<1.3 — expected and fine HERE, this container's
                     # entire purpose is holding that older line in isolation.
```
No `motor`/`boto3`/`certifi` — no Mongo, no B2, same trimmed-dependency precedent `notebook_service/requirements.txt` already sets for a service with nothing to persist.

### `Dockerfile`

Same shape as `video_service/Dockerfile`: `python:3.11-slim`, copy `requirements.txt` first, `pip install --no-cache-dir -r requirements.txt`, copy the rest, shell-form `CMD` so `$PORT` expands.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8082
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8082}
```

**Port 8082** — `video_service` defaults to 8080, `notebook_service` to 8081 specifically to avoid collisions (documented in the root `README.md`); 8082 is the next free slot in that same convention.

### `docker-compose.yml`

Same shape as `video_service/docker-compose.yml`, including the bounded log rotation (10MB × 3 files) — this service will `print(..., flush=True)` per job the same way, no reason to let `docker logs` grow unbounded over a long dev session.

---

## 2. `backend/` changes

### `backend/services/quantum_providers/iqm_adapter.py` (replaces the never-written in-process version)

```python
import os
import httpx  # already a backend/ dependency — video_overview_router.py already imports and uses it
              # for this exact "call an internal service with a shared secret" pattern.

from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter

class IqmAdapter(QuantumProviderAdapter):
    provider_id = "iqm"
    display_name = "IQM Resonance"

    def is_configured(self) -> bool:
        return bool(os.getenv("IQM_SERVICE_URL")) and bool(os.getenv("IQM_SERVICE_SECRET"))

    def _headers(self):
        return {"X-Internal-Secret": os.getenv("IQM_SERVICE_SECRET")}

    def list_devices(self) -> list[DeviceInfo]:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.get(f"{url}/devices", headers=self._headers(), timeout=15)
        resp.raise_for_status()
        return [{**d, "provider": self.provider_id} for d in resp.json()]

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.post(f"{url}/jobs", json={"qasm": qasm, "device_id": device_id, "shots": shots},
                           headers=self._headers(), timeout=30)
        # iqm_service returns 402 the same way qbraid_service/ionq_adapter/ibm_adapter
        # already surface "no funded credits" — one shared convention across every
        # adapter, in-process or over HTTP.
        if resp.status_code == 402:
            raise InsufficientCreditsError(resp.json().get("detail", "Insufficient IQM credits."))
        resp.raise_for_status()
        return resp.json()["provider_job_id"]

    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.get(f"{url}/jobs/{provider_job_id}", params={"device_id": device_id},
                          headers=self._headers(), timeout=15)
        resp.raise_for_status()
        return resp.json()
```

Note what `is_configured()` checks: `IQM_SERVICE_URL` + `IQM_SERVICE_SECRET`, **not** `IQM_TOKEN` — the real Resonance credential now lives entirely inside `iqm_service/.env` and `backend/` never sees it, same boundary `notebook_service` already draws around its own credentials.

### `backend/services/quantum_providers/__init__.py`

Add `IqmAdapter()` to `PROVIDER_REGISTRY` — one line, same as the IonQ/IBM additions.

### `backend/.env`

- **Remove** the unused `IQM_TOKEN` placeholder added during the original QRoute build (it was never wired to anything — the in-process adapter that would have used it was never written once the dependency conflict was found).
- **Add** `IQM_SERVICE_URL` (e.g. `http://127.0.0.1:8082` for local dev) and `IQM_SERVICE_SECRET`.

### `iqm_service/.env`

Owns `IQM_TOKEN` (the real credential) and `IQM_SERVICE_SECRET` (same shared value as `backend/.env`'s copy — this is the pair both sides compare, like `RENDER_SERVICE_SECRET`/`QBOOK_SERVICE_SECRET` already are).

---

## 3. Local dev workflow

```bash
cd iqm_service
docker build -t qrious-iqm-service .
docker run --env-file .env -p 8082:8082 qrious-iqm-service
# or: docker-compose up
```

Matches `video_service/DEPLOYMENT.md`'s current MVP posture exactly — local-only Docker, no cloud deploy target yet. A short `iqm_service/DEPLOYMENT.md` mirroring that file is worth adding once this is built, not before.

---

## 4. Build order

1. **Scaffold `iqm_service/`** — `Dockerfile`, `requirements.txt`, `main.py` with only `/health`. Verify it builds and runs in Docker *in isolation* — this is the step that proves `qiskit-iqm` installs and imports cleanly at all, away from `backend/`'s shared venv where it previously broke things.
2. **`/devices`** — curated list. Needs a real Resonance account check (this plan's one remaining unknown) — but a failed experiment here can't break IBM/IonQ the way it did inside `backend/`'s venv, which is the whole point of this isolation.
3. **`/jobs` POST + GET** — submit/poll/result, against the real account.
4. **`backend/services/quantum_providers/iqm_adapter.py`** — the HTTP shim above, registered in `PROVIDER_REGISTRY`.
5. **End-to-end verification** — same standard the other three adapters were held to: real credentials, real device list, and (with your explicit go-ahead, since it may consume real queue time/quota) a real submission.
6. **Frontend** — no changes needed. `QRoutePage`/`QRouteJobDetailPage` already render whatever `PROVIDER_REGISTRY` exposes generically; IQM appearing there is just another entry once steps 1-4 land.

---

## 5. Open questions for you

1. **Deploy target:** local-only Docker for now (matching `video_service`/`notebook_service`'s current MVP posture), or does this need to run somewhere the production `backend/` can actually reach it?
2. **`IQM_TOKEN` migration:** move your existing placeholder from `backend/.env` into a new `iqm_service/.env` (confirms the credential boundary described in §2), or do you want it to stay duplicated in both for now?
3. **Package choice, revisited:** the original plan ruled out `qiskit-iqm` in favor of nothing, specifically because it broke `backend/`'s shared venv. That's no longer the constraint once it's isolated — recommend sticking with plain `qiskit-iqm` (lighter) over `iqm-client[qiskit]` (pulls in `pandas`/`xarray`/`opentelemetry`/`iqm-pulse` — an internal instrument-control SDK's dependency footprint) unless a real account check in step 2 above turns up a reason `qiskit-iqm` specifically doesn't work for your Resonance account.
