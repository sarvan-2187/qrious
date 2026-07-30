# Running the IQM Service (MVP — Local Docker, No Cloud Deploy Yet)

**Current status:** `iqm_service/` (the IQM Resonance integration for QRoute) is not deployed to any cloud host. For this milestone it runs **locally via Docker**, same MVP posture as `video_service/`/`notebook_service/` — a deliberate decision, not a placeholder-because-we-forgot.

See [`PLANS/iqm-service.md`](../PLANS/iqm-service.md) for the full architecture and design rationale (including why the plan's original package pick, `qiskit-iqm`, turned out to be a dead end — it now refuses at import time to work with Resonance, confirmed live). This doc is just "how to actually run it."

---

## Why it's a separate service at all

IQM's SDK (`iqm-client[qiskit]`) needs its own `qiskit` line, which conflicts with `qiskit-ibm-runtime`/`qiskit-ionq` already installed in `backend/`'s shared venv — the same class of problem `video_service`/`notebook_service` already solved for their own heavy/conflicting dependencies. So the IQM integration lives in `iqm_service/`: a fully independent codebase (own `requirements.txt`, own Dockerfile) that `backend/` calls over HTTP per request. See `PLANS/iqm-service.md` §0 for why it's request/response (`POST /jobs` → `GET /jobs/{id}`, polled) rather than a persistent connection — same shape every other QRoute provider adapter uses.

Unlike `video_service`, this service has nothing to persist — no MongoDB, no B2. `backend/`'s `quantum_hw_jobs` collection is the single source of truth for job records; `iqm_service` is purely a stateless translator to/from the real IQM Resonance API.

---

## Option A — Full local stack (recommended for a demo)

Everything on your own machine: frontend, API, and IQM service.

**1. IQM service (Docker):**
```bash
cd iqm_service
cp .env.example .env
# edit .env: fill in the real IQM_TOKEN (from your Resonance dashboard at
# resonance.iqm.tech — Dashboard page, "Generate token"), and make up any
# random string for IQM_SERVICE_SECRET — e.g. `openssl rand -hex 32`

docker compose up --build -d
```
(Plain `docker build -t qrious-iqm-service .` + `docker run --rm -p 8082:8082 --env-file .env qrious-iqm-service` also works if you'd rather not use compose.)

Verify it's up:
```bash
curl http://localhost:8082/health
# -> {"status":"healthy"}
```

**Viewing logs:** `iqm_client.py` logs skipped/unreachable devices during `/devices`; FastAPI's own access log shows each request. Logs are capped at ~30MB total (`docker-compose.yml`'s `logging.options`: 10MB × 3 files, rotating), same as the other two services:
```bash
docker compose logs -f              # follow, all history
docker compose logs -f --tail 50    # follow, starting from the last 50 lines
```

**2. Backend API:** add these two lines to `backend/.env` (the exact same `IQM_SERVICE_SECRET` value you just put in `iqm_service/.env`):
```
IQM_SERVICE_URL=http://127.0.0.1:8082
IQM_SERVICE_SECRET=<the same random string from step 1>
```
Then, in a new terminal:
```bash
cd backend
python -m venv venv        # first time only
.\venv\Scripts\Activate    # Windows; `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

**3. Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**4. Demo it:** log in, open **QRoute** (`/qroute`) in the sidebar. IQM Resonance ("IQM" / `provider: "iqm"`) shows up automatically alongside qBraid/IonQ/IBM once `backend/`'s `PROVIDER_REGISTRY` reports it configured — no separate IQM-specific UI, `QRoutePage`/`QRouteJobDetailPage` render whatever the provider list returns generically. Pick a device (`garnet`, `emerald`, `sirius`, or their free `:mock` counterparts — see below), submit a circuit, and it polls `queued → running → completed` the same way every other provider does.

All three need to be running simultaneously. The IQM service runs detached (`-d`) in the background — stop it with `docker compose down` (run from `iqm_service/`) when you're done; the backend/frontend terminals need `Ctrl+C` as usual.

---

## Devices available on Resonance

Confirmed live against a real account (not guessed — the original plan's one open item):

| Device ID | Chip | Qubits | Real hardware? |
|---|---|---|---|
| `garnet` | IQM Garnet | 20 | Yes |
| `emerald` | IQM Emerald | 54 | Yes |
| `sirius` | IQM Sirius | 16 | Yes |
| `garnet:mock` | — | 20 | No — free, no queue time, random-bit test endpoint |
| `emerald:mock` | — | 54 | No — free, no queue time, random-bit test endpoint |
| `sirius:mock` | — | 24 | No — free, no queue time, random-bit test endpoint |

The `:mock` devices are useful for testing the full submit/poll/result path without spending real queue time or credits — they don't run an actual physical simulation, just return random measurement bits (per IQM's own docs), so don't expect physically meaningful counts from them.

---

## If you revisit cloud deployment later

The `Dockerfile` in `iqm_service/` is host-agnostic — `docker build` + `docker run` works identically on any Docker-capable host. The only things a future host needs: (1) the image builds larger than `video_service`'s (`iqm-client[qiskit]` pulls in `pandas`/`xarray`/`opentelemetry`/`iqm-pulse` as mandatory deps — budget disk/build-time accordingly, see `PLANS/iqm-service.md` §5), and (2) the two env vars used above (`IQM_TOKEN`, `IQM_SERVICE_SECRET`).
