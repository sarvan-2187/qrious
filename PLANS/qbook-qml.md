# qBook — QML Support + Dataset Uploads (Implementation Plan v1)

**Scope:** two additions to the existing `qBook` notebook environment (`notebook_service/`, `backend/routers/qbook_router.py`, `frontend/src/modules/qbook/`) so students can do real Quantum Machine Learning work in a notebook:
1. **QML libraries in the kernel** — `qiskit-machine-learning`, `pennylane` (+ `pennylane-qiskit`), `scikit-learn`, `pandas`, `seaborn`, `scipy` installed into `notebook_service`'s kernel environment, the same way `qiskit`/`qiskit-aer`/`matplotlib` already are.
2. **CSV dataset uploads** — a new "My Datasets" area where a student uploads a CSV (via presigned URL to a *second*, dedicated B2 bucket/key, kept separate from the existing `qrious-resources-bucket` key) and loads it into a running notebook session for `pandas`/QML work.

**This document is a plan for review, not a locked spec** — same convention `PLANS/qroute.md`/`PLANS/iqm-service.md` use. §6 lists the decisions that need your sign-off before any code is written.

---

## 0. Why this fits without changing qBook's architecture

`PLANS/qbook.md` established a strict boundary: `notebook_service` owns **no external credentials of any kind** — no MongoDB, no Firebase, no B2. It only spawns `ipykernel` processes and relays Jupyter protocol messages over an already-open WebSocket. That boundary is the reason a runaway or malicious student cell can't reach anything sensitive (`kernel_manager.py`'s `_sanitized_kernel_env()` already strips `*_SECRET`/`*_TOKEN`/`*_KEY` env vars from every kernel for exactly this reason).

Feeding a CSV into a kernel is new I/O, so it would be tempting to just give `notebook_service` its own B2 client. **This plan deliberately doesn't do that** — it keeps the existing shape intact:

```
B2 (datasets bucket) ──(presigned GET, minted by backend/)──▶ Browser ──(existing WS, new message type)──▶ Kernel's local disk
```

The browser is already the party that talks to both `backend/` (REST) and `notebook_service` (WebSocket) — same role it already plays for everything else in qBook. `notebook_service` still never holds a B2 credential, never makes an outbound HTTP call of its own, and never talks to Mongo. The only new thing it does is write bytes it's handed to a file — the same trust level as writing a cell's `source` to disk, which it already effectively does by executing it.

**Why not have `notebook_service` fetch the presigned URL itself** (saves the browser a round-trip): rejected — it would mean giving the kernel-execution service its own outbound-HTTP capability and a reason to reach out to arbitrary URLs, which is a bigger change to its threat model than "relay bytes the browser already fetched," for a dataset size class (teaching CSVs, low single-digit MB) where the extra hop costs nothing a student would notice.

---

## 1. `notebook_service/` changes

### `requirements.txt` — QML libraries

Add to the existing flat, unpinned list (installed into the kernel's own interpreter, same as `qiskit`/`qiskit-aer`/`matplotlib` today — `matplotlib` and `numpy` are already present, nothing to add there):
```
pandas
scikit-learn
scipy
seaborn
qiskit-machine-learning
pennylane
pennylane-qiskit
```
Two frameworks, deliberately both included: `qiskit-machine-learning` builds QML circuits directly on the `qiskit`/`qiskit-aer` stack already in this file, while `pennylane` is the other major QML framework students are likely to see in tutorials/papers — `pennylane-qiskit` is PennyLane's own plugin that lets a PennyLane circuit actually execute on Qiskit/Aer as its backend, so both frameworks share the same underlying simulator rather than each pulling in a separate one. `seaborn`/`scipy` are standard companions to `pandas`/`scikit-learn` for the classical side of a QML workflow (correlation heatmaps, statistical plots, optimizer routines) — small, pure-Python-plus-C-extension packages, not a new class of dependency risk.

**Flagged risk, not yet verified:** `qiskit-machine-learning` **and** `pennylane-qiskit` each pin to their own supported `qiskit` range, and this file's `qiskit`/`qiskit-aer` are unpinned (resolves to latest at build time) — now two packages that could disagree with that resolution, not one. This needs the same discipline `iqm-service.md` applied to `qiskit-iqm`: build the container and actually run `import qiskit_machine_learning` and `import pennylane; import pennylane_qiskit` before treating this as done, not before. If there's a real conflict, the fix is pinning `qiskit`/`qiskit-aer` in this file to whatever range satisfies both (this file is fully independent from `backend/`'s and `iqm_service/`'s qiskit versions, so pinning here has zero blast radius elsewhere) — worst case, if the two frameworks turn out to want genuinely incompatible qiskit ranges, `qiskit-machine-learning` would be the one kept (since it shares the stack already in this file) and PennyLane would run against its own bundled default simulator instead of `pennylane-qiskit`, dropping only the shared-backend benefit, not PennyLane itself.

### `kernel_manager.py` — per-session working directory

Today `AsyncKernelManager(kernel_name="python3")` starts with no explicit `cwd`, so every kernel on the box shares `notebook_service`'s own working directory — fine when nothing is written to disk, not fine once dataset files exist (two students' `iris.csv` would collide).

```python
SESSION_ROOT = Path(tempfile.gettempdir()) / "qbook_sessions"

# in get_or_create(), before start_kernel():
workdir = SESSION_ROOT / _safe_dirname(key)   # key is "{uid}:{notebook_id}"
(workdir / "datasets").mkdir(parents=True, exist_ok=True)
await km.start_kernel(preexec_fn=_set_kernel_limits, env=_sanitized_kernel_env(), cwd=str(workdir))
```
`KernelSession` gains a `workdir: Path` field; `shutdown()` does `shutil.rmtree(workdir, ignore_errors=True)` after the kernel process exits — datasets don't outlive the kernel they were loaded into, matching the existing "kernel state is ephemeral" model (a reaped/restarted kernel already loses its Python variables; losing the dataset file alongside them is consistent, not a regression).

### `main.py` — new WS message type

Alongside the existing `execute`/`interrupt` message types handled in `ws_session()`:

```python
elif msg_type == "attach_dataset":
    ok, error = write_dataset(session.workdir, message["filename"], message["content_b64"])
    if ok:
        await websocket.send_json({"type": "dataset_attached", "filename": message["filename"]})
    else:
        await websocket.send_json({"type": "error", "message": error})
```

`write_dataset()` (new, small, in `kernel_manager.py` or a new `datasets.py`):
- `filename = os.path.basename(filename)` and reject if empty or contains `..` — the only path-traversal guard needed since it's forced under `workdir/datasets/`.
- Reject if `content_type`/extension isn't `.csv` (v1 scope, per §6).
- Base64-decode and reject over a size cap (recommend 5–10MB — see §6) **before** writing, so an oversized payload can't fill the container's disk.
- Write to `workdir / "datasets" / filename`.

A cell then does exactly what a real Jupyter notebook would: `pd.read_csv("datasets/iris.csv")` — no new API surface inside the kernel, just a file that's already there.

---

## 2. `backend/` changes

### `storage_service.py` — second B2 client, kept separate from the resources bucket

This is the piece that needs **your new B2 key** — a distinct Application Key scoped to a new bucket (recommend a fresh bucket, e.g. `qrious-ml-bucket`, not a path prefix inside `qrious-resources-bucket`), so a leaked/compromised dataset-upload credential can't touch course PDFs/videos and vice versa. New env vars, parallel to the existing four:

```
B2_DATASETS_KEY_ID=...
B2_DATASETS_APPLICATION_KEY=...
B2_DATASETS_BUCKET_NAME=qrious-qbook-datasets
```
(`B2_ENDPOINT` is reused as-is, assuming this bucket lives in the same B2 account/region — flagged in §6 in case it doesn't.)

Add a second boto3 client and mirrored functions, following the exact shape the existing four functions already use — `generate_dataset_upload_url()`, `generate_dataset_download_url()`, plus a new `delete_object()` (the existing file has no delete function at all yet; datasets need one so `DELETE /datasets/{id}` isn't permanent-orphan-only).

### `backend/models/qbook_dataset.py` (new) — `qbook_datasets` collection

```python
class DatasetOut(MongoBaseModel):
    owner_uid: str
    filename: str          # sanitized display name
    b2_key: str             # f"{owner_uid}/{uuid4()}_{filename}"
    content_type: str        # "text/csv"
    size_bytes: int
    status: str              # "pending" | "confirmed" — same two-step as resources/upload-url
    created_at: datetime
```

### `backend/routers/qbook_datasets_router.py` (new), mounted at `/api/v1/qbook/datasets`

Deliberately a separate file from `qbook_router.py` (which is already sizable) — same reasoning `video_overview_router.py` gets its own file instead of living inside the lessons router. Mirrors the **exact** two-step upload pattern `routers/educator.py`'s `POST /lessons/{id}/resources/upload-url` + `POST /resources/{id}/confirm` already establishes, so this isn't a new convention:

- `POST /upload-url` — body `{filename, content_type, size_bytes}`. Validates `.csv` extension and `size_bytes` against the cap (client-declared, a UX guard not a hard boundary — the real enforcement is the WS-side size check in §1). Mints the presigned PUT via the new dataset client, inserts a `qbook_datasets` doc with `status: "pending"`, returns `{upload_url, dataset_id}`.
- `POST /{dataset_id}/confirm` — marks `status: "confirmed"`, same shape as `resources/{id}/confirm`.
- `GET /` — list current user's confirmed datasets (`owner_uid == current_user.firebase_uid`).
- `GET /{dataset_id}/download-url` — presigned GET, for the frontend to fetch bytes it then relays over the kernel WS.
- `DELETE /{dataset_id}` — deletes the Mongo doc and the B2 object.

All gated by the existing `get_current_user`, no new auth mechanism.

---

## 3. `frontend/` changes

- `frontend/src/modules/qbook/hooks/useQBookDatasetsApi.ts` — CRUD against `/api/v1/qbook/datasets/...`, same shape as `useQBookApi.ts`: request an upload URL, `PUT` the file directly to B2 (never through `backend/`), confirm, list, delete.
- `frontend/src/modules/qbook/components/DatasetManagerPanel.tsx` — a collapsible panel in `QBookEditorPage.tsx` (sits alongside the cell list, not inside the `AlgorithmCard` grid pattern): upload button (accepts `.csv` only, client-side size check against the same cap), a list of "My Datasets" with a "Load into this notebook" action per row.
- `useQBookKernelSocket.ts` gains `attachDataset(filename: string, bytes: ArrayBuffer)`: base64-encodes, sends `{"type": "attach_dataset", filename, content_b64}`, resolves on `dataset_attached` / rejects on `error` — same request/reply pattern `runCell` already uses for `execution_done`.
- "Load into this notebook" wires the two together: `GET download-url` → `fetch()` the bytes from B2 directly → `attachDataset(...)`. Explicit, per-session, user-triggered — **not** auto-reattached on kernel reconnect (see §6.3 for why that's deferred, not forgotten).

### Starter content

A "New QML Notebook" creation option alongside the existing plain starter (`qbook_router.py`'s `STARTER_CELLS`) — seeded with `import pandas as pd`, `import seaborn as sns`, and a choice of boilerplate for either `qiskit_machine_learning` or `pennylane`/`pennylane_qiskit`, plus a comment pointing at the Datasets panel. Cheap to add, makes the feature discoverable instead of a blank notebook next to an unrelated-looking upload button.

---

## 4. Out of scope for this v1

- Non-CSV formats (Excel, JSON, Parquet) — CSV only, per the original ask.
- Auto-reattaching a dataset when a kernel is reaped and restarted (student re-clicks "Load into this notebook" — one click, matches the existing "kernel state is ephemeral" model students already live with for variables).
- Per-notebook "datasets used here" tracking/auto-suggest — a real nice-to-have, deferred rather than blocking v1.
- Sharing a dataset between students (owner-scoped only, same as notebooks themselves).

---

## 5. Build order — status

1. ✅ **Done, verified.** `pandas`/`scikit-learn`/`scipy`/`seaborn`/`qiskit-machine-learning`/`pennylane`/`pennylane-qiskit` added to `notebook_service/requirements.txt`. Built the Docker image in isolation and confirmed no conflict at all: pip resolved `qiskit==2.3.0`/`qiskit-aer==0.17.2` and both QML frameworks installed cleanly against them (`qiskit-machine-learning==0.9.0`, `pennylane==0.45.1`, `pennylane-qiskit==0.45.0`). Went further than an import check — actually ran a `pennylane-qiskit` circuit on the `qiskit.aer` device and a `qiskit-machine-learning` `EstimatorQNN.forward()` inside the built container; both executed correctly. §6.3's fallback (pin versions, or drop `pennylane-qiskit`) was **not needed**.
2. ✅ **Done.** `kernel_manager.py`: per-session `workdir` (`SESSION_ROOT / _safe_dirname(key)`), passed as `cwd=` to `start_kernel`, removed via `shutil.rmtree` in `KernelSession.shutdown()`. Also added `write_dataset()` (path/extension/size-guarded, `DATASET_MAX_BYTES` env-configurable, default 10MB).
3. ✅ **Done.** `main.py`: new `attach_dataset` WS message type, calling `write_dataset()` and replying `dataset_attached`/`error`.
4. ✅ **Done.** `backend/storage_service.py`: second `datasets_s3_client` (own `B2_DATASETS_KEY_ID`/`B2_DATASETS_APPLICATION_KEY`/`B2_DATASETS_BUCKET_NAME`, reusing `B2_ENDPOINT`), plus `generate_dataset_upload_url()`/`generate_dataset_download_url()`/`delete_dataset_object()`.
5. ✅ **Done.** `backend/models/qbook_dataset.py` + `backend/routers/qbook_datasets_router.py` (5 endpoints per §2), registered in `main.py`, `qbook_datasets` index added in `database.py`. Verified: backend imports cleanly and all 5 routes resolve correctly under `/api/v1/qbook/datasets`.
6. ✅ **Done.** Frontend: `useQBookDatasetsApi.ts` (upload/list/load/delete), `attachDataset()` added to `useQBookKernelSocket.ts` (base64-relays fetched bytes over the existing WS), `DatasetManagerPanel.tsx` wired into `QBookEditorPage.tsx`. Verified: full frontend `tsc -b` build passes clean.
7. ✅ **Done.** B2 CORS on `qrious-ml-bucket`. Root cause of the first real upload attempt's "network error": B2 auto-creates a bucket with **native** CORS rules (not visible/settable through the S3-compatible `PutBucketCors` call — it errors with `InvalidRequest` if native rules already exist) that only permit downloads (`s3_get`/`s3_head`/`b2_download_file_*`) from any origin. There was no rule permitting `PUT` at all, so the browser's preflight for the upload silently failed. Fixed via B2's native API (`b2_update_bucket`, called directly over HTTP — no S3 SDK path for this): added a `qbookDatasetUploads` rule permitting `s3_put`/`s3_get`/`s3_head` with `content-type` as an allowed header, scoped to the exact frontend origins already trusted by `backend/main.py`'s `CORSMiddleware` (`localhost:5173`/`127.0.0.1:5173`/`localhost:3000`/`127.0.0.1:3000`/`https://schrodinger-squad.vercel.app`). Verified with a real preflight simulation (`OPTIONS` with `Origin`/`Access-Control-Request-Method` headers) — B2 now responds with the correct `Access-Control-Allow-*` headers for `localhost:5173`.
8. ⏳ **Remaining — needs a real running stack, not just static verification:** upload a real CSV through the live UI, load it into a notebook, `pd.read_csv()` it in a cell, and train a small `qiskit-machine-learning`/`pennylane` model against it end-to-end.

---

## 6. Decisions (confirmed with the user)

1. **B2 dataset bucket:** a **new bucket** (`qrious-ml-bucket`), with a fresh Application Key scoped only to it — not a path prefix inside the existing `qrious-resources-bucket`. Confirmed: least-privilege, same isolation precedent as `iqm_service`/`video_service` each getting their own credentials. Reuses the same `B2_ENDPOINT` as the existing bucket (same account/region).
2. **Size cap:** **10MB per CSV**, enforced twice — a UX-level check in `qbook_datasets_router.py`'s `upload-url` endpoint (client-declared `size_bytes`), and the real boundary in `kernel_manager.py`'s `write_dataset()` (measured, post-base64-decode, before anything is written to disk).
3. **`qiskit-machine-learning`/`pennylane-qiskit` version conflict:** turned out to be a non-issue — see build step 1 above. No pinning was needed.
4. **Env var placement, corrected during implementation:** the B2 dataset credentials were initially added to `notebook_service/.env`, which would have broken the "notebook_service never holds a B2 credential" invariant from §0. Moved to `backend/.env` as `B2_DATASETS_KEY_ID`/`B2_DATASETS_APPLICATION_KEY`/`B2_DATASETS_BUCKET_NAME`; `notebook_service/.env` now has a comment explaining why they don't belong there.
