# qBook — Implementation Plan (v1)

**Scope:** a personal, in-app notebook environment — "qBook" — where any authenticated student creates their own multi-cell notebooks and runs real Python (stdlib, numpy, Qiskit/Qiskit Aer) interactively, cell by cell, with results (text, plots, circuit diagrams) rendered inline. This is Option B from the earlier options review: a dedicated service, not a bolt-on to the existing one-shot code executor.

**Status of prior scaffolding:** none. No `notebook_service/` directory, no `qbook_notebooks` collection, no router, no frontend module. This plan starts from zero, built to match the conventions `video_service/` already established for splitting a heavy feature out of `backend/`.

**Locked-in decisions (confirmed with the user before writing this plan):**
1. **Scope:** personal/standalone notebooks only — a "My Notebooks" area, no course/lesson dependency. `backend/models/lms.py` already has course→lesson→enrollment if this needs to attach to curriculum later; not built now.
2. **Execution model:** one shared process manages many per-session kernels (not a fresh Docker container per student). Resource-limited, no new orchestration to stand up.
3. **Hosting:** local-only via Docker for this MVP, same posture `video_service` is in today — no cloud deploy target in this plan.

---

## 0. Why this differs from `video_service`'s shape

`video_service` is a fire-and-forget job runner: the API inserts a Mongo doc, triggers a job over HTTP, and the service writes results back to the same doc for the API to poll. qBook is fundamentally interactive — a student needs a live, low-latency channel to a running kernel, not a job queue. That changes two things relative to the `video_service` precedent:

- **Transport:** a persistent WebSocket per active notebook session, not a single triggered HTTP POST.
- **Data ownership:** `notebook_service` never touches MongoDB at all. It only manages ephemeral kernel processes. Notebook content (cells, outputs, titles) is CRUD'd through `backend/` like everything else already is — the frontend saves a cell's result back to `backend` right after the kernel streams it, over a normal authenticated REST call. This is simpler than `video_service`'s trimmed `database.py` copy: there's nothing to trim, because there's no DB client to have in the first place.

The one thing carried over from `video_service`'s precedent is the **shared-secret auth bridge** — but adapted, since qBook's frontend talks to the service directly (for latency: proxying every kernel message through `backend` would double every round trip), not through `backend` as an intermediary:

```text
Frontend
   │
   ├─ 1. HTTPS, Firebase-authenticated ─────────▶ FastAPI Cloud (backend/)
   │                                                 verifies ownership of the
   │                                                 notebook, mints a short-lived
   │                                                 signed session token
   │◀─ { session_token, notebook_service_url } ──────┘
   │
   └─ 2. WebSocket, session_token in query ─────▶ notebook_service (Docker, local for MVP)
                                                     verifies token via shared secret
                                                     (QBOOK_SERVICE_SECRET, same value
                                                     on both sides — no Firebase Admin
                                                     SDK needed in notebook_service)
                                                     → spawns/reuses an ipykernel kernel
                                                     → relays execute/output messages
   │◀─ streamed outputs (stdout, images, errors) ────┘
   │
   └─ 3. PATCH cell + outputs back to backend ──▶ FastAPI Cloud → Mongo (qbook_notebooks)
```

`backend/` never proxies kernel traffic and never talks to `notebook_service` over HTTP — it only issues the token. `notebook_service` never talks to Mongo or Firebase — it only trusts a signature. Each side does exactly one thing.

---

## 1. `notebook_service/` — the kernel-execution service

New top-level directory, sibling to `backend/`, `frontend/`, `video_service/`.

**Package choice:** the earlier options review named "Jupyter Kernel Gateway" as the shorthand for this architecture (shared process, many kernels). For the actual implementation, this plan recommends a **thin FastAPI app built directly on `jupyter_client`** (`KernelManager`/`KernelClient`) rather than adopting the `jupyter_kernel_gateway` package itself — Kernel Gateway bundles its own Tornado server and auth model, which fights rather than helps when the auth model here is a custom signed token, not Kernel Gateway's own token scheme. `jupyter_client` + `ipykernel` are the actual libraries doing the kernel-spawning and message-passing work in both cases; wrapping them directly in FastAPI keeps this service in the same stack as everything else in the repo and gives full control over the WebSocket handshake. Same architectural class as discussed, leaner concrete dependency.

**`notebook_service/main.py` responsibilities:**
- `GET /health`
- `WS /ws/session?token=...` — the only real endpoint:
  1. Verify `token` (HMAC-signed, `{notebook_id, uid, exp}`) against `QBOOK_SERVICE_SECRET`. Reject on bad signature or expiry — mirrors the `X-Internal-Secret` check in `video_service/main.py`, just carried in a WS query param instead of a header, since browsers can't set custom WS headers.
  2. Look up or start a kernel for `(uid, notebook_id)` via `jupyter_client.KernelManager` (start a fresh `ipykernel` process if none is running for this session).
  3. Relay: forward `execute_request` messages from the browser onto the kernel's shell channel, forward `stream`/`execute_result`/`display_data`/`error` messages from the kernel's iopub channel back to the browser — the standard Jupyter message shapes, so the frontend gets structured `{output_type, ...}` objects it can render and later persist as-is.
- A background asyncio task reaping kernels idle past a timeout (e.g. 20 min), and a per-execution watchdog that sends a kernel interrupt if an `execute_reply` doesn't arrive within a bounded window (e.g. 30s) — a runaway `while True: pass` cell must not hang a kernel forever, since this is now a persistent process, not the old 5s one-shot subprocess.
- Per-kernel resource ceiling (memory via `RLIMIT_AS`, CPU via `RLIMIT_CPU`) applied when the kernel process is spawned, and a hard cap on concurrently-running kernels (return a "lab is busy, try again shortly" error past the cap) — the old `code_execution_service.py` AST import-blocklist (`FORBIDDEN_IMPORTS`) does not carry over. A notebook meant to teach real Python shouldn't block `os`/`sys`/`requests`; the safety story moves from "block imports" to "bound what a process can consume and how long it can run," which is the correct trade for this feature but is a real, deliberate change in the threat model worth flagging plainly.

**`notebook_service/requirements.txt`** (flat, self-contained, unpinned — matching `video_service/requirements.txt`'s style): `fastapi`, `uvicorn[standard]`, `ipykernel`, `jupyter_client`, `pyzmq`, `pyjwt`, `qiskit`, `qiskit-aer`, `matplotlib`, `numpy`. No `motor`/`certifi`/`boto3` — this service never touches Mongo or B2.

**`notebook_service/Dockerfile`** — same shape as `video_service/Dockerfile` (`python:3.11-slim`, `COPY requirements.txt` first, `pip install`, then `COPY . .`, `CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}`). No extra `apt-get` layer is needed (no ffmpeg/Chromium equivalent — `ipykernel` is pure Python + the same numpy/qiskit already installed via pip).

---

## 2. `backend/` additions

**`backend/models/notebook.py`** (new) — following `models/lms.py`'s `MongoBaseModel`/`serialize` convention (ObjectId handling), not the simpler ad-hoc shape in `code_execution_model.py`, since this needs real `_id` semantics for a list/detail/update API:

```python
class NotebookCell(BaseModel):
    id: str                       # uuid4, stable across edits
    cell_type: Literal["code", "markdown"]
    source: str
    outputs: list[dict] = []      # nbformat-shaped output objects, stored as-is
    execution_count: int | None = None

class NotebookOut(MongoBaseModel):
    owner_uid: str
    title: str
    cells: list[NotebookCell]
    created_at: datetime
    updated_at: datetime
```

Storing `outputs` in the nbformat output shape (not a custom simplified one) means an export endpoint is a near-direct wrap into a real `.ipynb` (nbformat v4) document — genuinely a "Jupyter notebook" a student can download and open elsewhere, which is the literal ask behind the qBook name.

**`backend/routers/qbook_router.py`** (new), `APIRouter(prefix="/api/v1/qbook", tags=["qBook"])`, registered in `main.py` next to `code_playground_router`:
- `GET /notebooks` — list current user's notebooks (`owner_uid == current_user.firebase_uid`)
- `POST /notebooks` — create, seeded with a starter cell (`import qiskit` + a one-line markdown intro)
- `GET /notebooks/{id}` — fetch, 404/403 if not owned
- `PATCH /notebooks/{id}` — update title and/or cells (the frontend calls this right after a cell finishes streaming output, and on markdown edits/reordering)
- `DELETE /notebooks/{id}`
- `POST /notebooks/{id}/session` — verifies ownership, mints the short-lived signed token described in §0, returns `{ session_token, notebook_service_url }` (`notebook_service_url` comes from an env var since it's not deployed anywhere fixed yet)
- `GET /notebooks/{id}/export` — streams a real `nbformat.v4` JSON document (`Content-Disposition: attachment; filename="{title}.ipynb"`)

All routes gated by the existing `get_current_user` (`backend/auth.py`) — no new auth mechanism needed on this side, only the new signing step for `/session`.

**New env vars:** `backend/.env` needs `QBOOK_SERVICE_SECRET` (signs the session token) — it does **not** need a `QBOOK_SERVICE_URL`, since `backend` never calls `notebook_service` itself; only the frontend needs to know where it lives, via `VITE_QBOOK_SERVICE_URL`.

**Index:** `notebooks: { owner_uid: 1 }` added alongside the other index definitions in `backend/database.py`/`db/indexes.py`.

**Storage: MongoDB, not B2 — stated explicitly.** The full notebook (cells, source, outputs) lives in `qbook_notebooks`, not Backblaze B2. B2 in this codebase is for large, mostly-immutable binary media (video, PDFs) served via presigned URLs; a qBook cell's output (stdout text, or a matplotlib/Qiskit PNG) is typically tens to a few hundred KB, and every cell run needs a targeted partial update (`PATCH` one cell's `outputs`), which MongoDB does natively and B2 cannot — B2 has no partial-write API, so every save would mean re-uploading the whole notebook. As long as `PATCH` overwrites a cell's `outputs` on re-run rather than appending to it, total document size stays bounded well under MongoDB's 16MB cap for a teaching notebook. If a notebook ever accumulated enough large plots to approach that cap, the fallback is to offload just the oversized output blobs to B2 (`b2_key` reference in place of inline base64) while everything else stays inline — not planned for v1, since typical outputs here don't come close.

---

## 3. `frontend/` additions

New module `frontend/src/modules/qbook/`, following the `gates-playground` module shape:

- `pages/QBookLibraryPage.tsx` — list of the student's notebooks as clickable tiles. This **is** a legitimate use of the `AlgorithmCard` grid-card pattern (§1.4 of `DESIGN_SYSTEM.md`) — a notebook tile is exactly a "grid-able, navigable unit."
- `pages/QBookEditorPage.tsx` — the actual notebook: ordered cells, add/reorder/delete, per-cell run. Cells sit directly on the page shell per §1.1 — **not** wrapped in the card pattern, matching how `MonacoEditorPanel`/`ExecutionConsole` are laid out in gates-playground today.
- `components/NotebookCell.tsx` — reuses the existing `MonacoEditorPanel.tsx` editor for the `code` cell type, `react-markdown` (already a dependency) for `markdown` cells, and a small output renderer switching on `output_type`/MIME (`text/plain` → `<pre>`, `image/png` → `<img src="data:image/png;base64,...">`, `error` → styled traceback block per the existing `§1.7` error-state tokens).
- `hooks/useQBookApi.ts` — CRUD against `/api/v1/qbook/...` via the shared `apiClient` (`frontend/src/lib/apiClient.ts`), identical shape to `useCodeExecutionApi.ts`.
- `hooks/useQBookKernelSocket.ts` — calls `POST /notebooks/{id}/session`, opens `new WebSocket(`${notebook_service_url}/ws/session?token=...`)`, exposes `runCell(cellId, source)` and a stream of incoming output messages. Plain browser `WebSocket` is sufficient — no new npm dependency; `notebook_service` isn't using `socket.io`.
- `components/QBookLocalOnlyNotice.tsx` — mirrors `VideoServiceLocalOnlyNotice.tsx` exactly: when `import.meta.env.PROD` is true, the deployed frontend has no reachable `notebook_service` (local-only per the hosting decision), so show this static notice instead of the live editor.

**Routing** (`App.tsx`, inside the existing `AppLayout` route block):
```tsx
<Route path="/qbook" element={<ProtectedRoute><QBookLibraryPage /></ProtectedRoute>} />
<Route path="/qbook/:notebookId" element={<ProtectedRoute><QBookEditorPage /></ProtectedRoute>} />
```

**Nav** (`AppLayout.tsx`, "Learning Tools" `SidebarGroup`) — one more `SidebarMenuItem`/`SidebarMenuButton`/`Link` following the exact pattern already used for `/playground`.

No new frontend dependencies are needed — `@monaco-editor/react`, `react-markdown`, and the browser's native `WebSocket` cover everything.

---

## 4. Out of scope for this v1

Explicitly deferred, not forgotten:
- Cloud hosting for `notebook_service` (config change later, per the `video_service` precedent — Dockerfile is host-agnostic).
- Per-student container isolation (would mean revisiting the execution-model decision in §"Locked-in decisions").
- Course/lesson-scoped notebooks (the LMS model already supports it; not wired up here).
- `.ipynb` **import** (export only, for v1).
- Multiple students editing the same notebook concurrently.

---

## 5. Verification plan

1. `cd notebook_service && docker build -t qbook-notebook-service . && docker run -p 8080:8080 --env-file .env qbook-notebook-service`, confirm `GET /health`.
2. Point `backend/.env`'s `QBOOK_SERVICE_SECRET` and frontend's `VITE_QBOOK_SERVICE_URL` at it; run `backend` and `frontend` locally per the existing README steps.
3. Create a notebook via the UI, run a plain cell (`print("hello qbook")`) — confirm output streams back and a `PATCH` lands in `qbook_notebooks` (check Mongo).
4. Run a Qiskit cell that calls `.draw('mpl')` on a small circuit — confirm an inline image renders, proving `display_data`/image output round-trips correctly, not just stdout.
5. Submit `while True: pass` — confirm the watchdog interrupts the kernel within the configured window instead of hanging the session.
6. Leave a session idle past the reap timeout — confirm the kernel process exits (check container memory/process count drops).
7. `GET /notebooks/{id}/export` — confirm the downloaded `.ipynb` opens cleanly in a real Jupyter/VS Code notebook viewer.
