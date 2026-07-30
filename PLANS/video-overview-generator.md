# Video Overview Generator — Implementation Plan (v1)

> **Update 3 — service renamed.** `video_service/` (referenced throughout this doc) is now
> `qstudio_service/`, and `RENDER_SERVICE_URL`/`RENDER_SERVICE_SECRET` are now
> `QSTUDIO_SERVICE_URL`/`QSTUDIO_SERVICE_SECRET` — it hosts qStudio's other
> heavy-dependency outputs (Audio Overview, Slides) alongside video now, not just video.
> See `PLANS/qstudio.md` §0a. Everything below is otherwise historically accurate —
> the architecture, deploy topology, and reasoning did not change, only the name.

**Scope:** AI-generated narrated slide-deck video overviews (NotebookLM-style), delivered through the existing video resource pipeline. This is v1 — HTML slide + TTS narration, no code execution, no arbitrary rendering engine. A Manim-based true-animation generator is a separate, later effort (see `quantathon_implementation_document.md` Phase 9, `manim_service.py` — not yet implemented, no scaffolding exists for it either).

**Status of prior scaffolding:** none found. No `video_overviews` collection, router, service, or worker file exists anywhere in the repo. This plan starts from zero, built to match existing conventions exactly.

**Update — deployment plan changed twice after this was written; current state is simpler than either.** This plan originally targeted Render's Free tier for the render/video service (§1, §1a, §5 below reflect that reasoning as it stood at the time). After deploying there, real test jobs showed the container getting silently killed mid-`ffmpeg`-encode — full log analysis (same instance ID, a fresh "Started server process" boot sequence 48 seconds after the last log line, no error ever written) pointed conclusively at an **OOM kill**: Chromium (for slide screenshots) and `ffmpeg` (for encoding) running back-to-back exceeded the Free tier's 512MB RAM ceiling. A move to a self-managed Oracle Cloud VM was planned next — but before that was built out, the decision changed again: **for this MVP, `video_service` simply runs locally via Docker, with no cloud deploy target at all.** No tier limits to work around, nothing to provision. The service itself (`video_service/`, renamed from `backend/render_service/` — now a top-level sibling of `backend/` and `frontend/`) and its request-driven-per-job design are unchanged by any of this; only the deploy target (and the Render-Free-tier-specific reasoning throughout §1/§1a/§5 below) is superseded. See `DEPLOYMENT.md` for the current run instructions — the Dockerfile is host-agnostic, so revisiting a real cloud deploy later is a config change, not a rewrite.

**Update 2 — student-facing entry point added; deployed frontend shows a static notice.** §4/§6 below describe only the original educator, lesson-scoped flow (`POST /api/lessons/{lesson_id}/video-overviews`, gated by `require_lesson_owner`). A second, parallel entry point now exists for students (and educators) with no course/lesson context: `POST /api/video-overviews` / `GET /api/video-overviews` (chat history) / `GET /api/video-overviews/{id}/view-url`, gated only by `get_current_user` — same `run_pipeline`, same `video_overviews` collection, just with `lesson_id: null` on the doc. `video_service/pipeline.py::_upload_and_register` branches on `job.get("lesson_id")`: lesson-scoped jobs still get a `resources` doc (so the video shows up in that lesson's library); standalone jobs skip that (there's no lesson to attach to) and playback reads the B2 key straight off the `video_overviews` doc via the new `view-url` endpoint instead of the shared `/api/resources/{id}/view-url`. Frontend: `frontend/src/pages/VideoOverviewChatPage.tsx`, a ChatGPT-style prompt/response page routed at `/video-overview`, with a sidebar tab in `AppLayout.tsx` ("Learning Tools" group) visible to every authenticated user. Separately: because `video_service` isn't deployed anywhere (see Update above), both this page and the existing `VideoOverviewGenerator.tsx` now check `import.meta.env.PROD` and render a static "local-only feature" notice (`VideoServiceLocalOnlyNotice.tsx`) instead of the live generator when the frontend itself is a production build — the deployed API's `RENDER_SERVICE_URL` has nothing reachable to point at, so a submitted job there would otherwise just spin at "queued" forever with no real error surfaced to the user.

---

## 0. Corrections to stated premises

Two assumptions in the original brief didn't hold up against the actual repo and are corrected here so the rest of the plan is trustworthy:

- **"q- prefix" design tokens**: no such convention exists anywhere in `frontend/src` (checked). Tokens are plain CSS custom properties under `@theme` in `frontend/src/index.css` (`--color-primary`, `--color-accent`, etc., shadcn-style). The plan below uses the tokens as they actually are.
- **"emerald accent"**: confirmed correct — `emerald-400/500/600` appears 57 times across 28 files as a secondary/success/highlight color. The *primary* brand color is purple (`#8b00ff` light / `#d4b3ff` dark), not emerald — emerald is the accent, not the base.

---

## 1. Repo-specific prerequisites

| Requirement | Status | Evidence |
|---|---|---|
| `ffmpeg` system binary | Not present on this dev machine, and **not needed on the FastAPI Cloud backend at all** — see §1a. Runs instead inside `video_service`'s Docker image, which has full control over installed OS packages (unlike FastAPI Cloud). Resolved by the topology decision below, not by adding it to the existing backend. | Bash check, this session; architecture decision below |
| Headless-browser-capable host (Playwright + Chromium) | Same resolution as ffmpeg — moves entirely into `video_service`'s Docker image. **Not** installed on FastAPI Cloud, and does not need to be. | `venv/Scripts/python.exe -c "import playwright"` → `ModuleNotFoundError` (confirms it's not currently a backend dependency, correctly so) |
| Backend hosting/runtime image | **Resolved, twice.** API backend is FastAPI Cloud (does not support arbitrary OS packages/Docker). Rendering moves to a separate `video_service`, a Docker container invoked over HTTP rather than run as a continuously-polling process. Originally deployed to Render's Free tier; moved off after an OOM kill running Chromium + ffmpeg together exceeded its 512MB ceiling. **Currently: runs locally via Docker for this MVP** — no cloud host at all, see `DEPLOYMENT.md` (see the note at the top of this doc for the full history). The request-driven-not-polling design itself was independent of any of these host choices and didn't need to change. Two services, two deploy targets — see §1a. | Architecture decision below |
| PDF text extraction library | Not present. No `pypdf`/`pdfplumber`/`PyMuPDF` in `requirements.txt`. (`PyMuPDF`/`fitz` is importable from the same incidental global Python as Playwright — same caveat: not a real project dependency, and it's AGPL-licensed, which is a reason to avoid it anyway.) `pypdf` confirmed as the choice — see §7. | `requirements.txt` read; import checks |
| LLM provider | **Confirmed: Groq only.** `GROQ_API_KEY` is the only LLM-related key in `backend/.env`; no `ANTHROPIC_API_KEY`. `services/groq_service.py` wraps `ChatGroq(model="llama-3.3-70b-versatile")`, consumed by `services/langchain_service.py` for the existing AI tutor RAG chat. The render service's own trimmed `groq_service.py` copy (§1a) uses the same model/provider — no new LLM provider. | `.env` key names (values not read), `groq_service.py`, `langchain_service.py` |
| HTML templating (Jinja2) | **Already available** — transitive dependency, importable from `venv`. No new dependency needed for the slide template. | `venv/Scripts/python.exe -c "import jinja2"` → succeeds (3.1.6) |
| HTTP client (`httpx`) | **Already available** — transitive dependency of `fastapi[standard]`. Also the client FastAPI Cloud uses to call the render service (§4). | same check |
| gTTS, mutagen, anthropic | Not installed anywhere (venv or global). gTTS/pypdf/playwright will be added to the **render service's** dependency set only — not to `backend/requirements.txt`. | import checks |

---

## 1a. Deployment topology (confirmed)

```text
Frontend
        │
        ▼  HTTPS (existing)
FastAPI Cloud
(API + Auth + MongoDB)
        │
        ▼  HTTP POST, authenticated (FastAPI BackgroundTasks — see §4)
video_service/  — Docker container, run locally for this MVP (no cloud host yet)
        │
        ▼  runs synchronously inside the request handler:
   Groq → optional PDF extraction → gTTS → Playwright + Chromium → ffmpeg (timeout-guarded)
        │
        ▼
   Upload MP4 to Backblaze B2  →  update MongoDB (`video_overviews`, `resources`)
        │
        ▼  HTTP response back to FastAPI Cloud when finished (not awaited/consumed — see §4)
```

Two separate codebases, splitting API-serving from rendering:

1. **FastAPI Cloud (existing `backend/`, unchanged deploy target)** — owns all HTTP endpoints (§4). On a generate request it inserts a `video_overviews` doc with `status: "queued"`, schedules an authenticated HTTP call to `video_service` to kick off that specific job, and returns the job id to the frontend immediately — it does not wait for rendering to finish. It never touches ffmpeg, Playwright, or gTTS. `backend/requirements.txt` stays exactly as it is today — no rendering dependencies leak into the API service's image.
2. **`video_service/` (top-level, sibling of `backend/` and `frontend/`)** — a small HTTP service (its own FastAPI app) exposing one authenticated endpoint, `POST /internal/video-overview`. For this MVP it runs locally via Docker (`docker build` + `docker run`, see `DEPLOYMENT.md`) — deliberately not deployed to any cloud host yet, since the Dockerfile is host-agnostic and moving it later needs no code changes. Each call processes exactly the one job it was given, running the full pipeline (§3: Groq → optional PDF grounding → gTTS → Playwright screenshot → ffmpeg assembly → B2 upload) synchronously inside that single request/response cycle, writing status updates back to the `video_overviews` doc as it progresses, and returning an HTTP response only once the job reaches `"ready"` or `"failed"`. This is the only piece that needs ffmpeg and Chromium installed, which is exactly why it's a separate Docker-based codebase instead of running inside FastAPI Cloud.

**Why request-driven instead of a continuously-polling worker:** originally chosen to fit Render's Free tier specifically (services spin down between requests; a single held-open request fit that model, a polling worker billing for constant uptime didn't). That specific reasoning is now moot (running locally has no tier at all) — but the design itself is still the right call independent of host: no queue/broker infrastructure to run, no polling loop, no multi-consumer coordination to build. `video_service` sits idle until FastAPI Cloud calls it for a specific job, handles that one request start-to-finish, and returns.

Both services talk to the **same** MongoDB database and the **same** B2 bucket — no new datastore, no message broker, no queue product. The `video_overviews` doc is the shared state; there's no polling of it by `video_service`, since FastAPI Cloud tells it exactly which job to run in the trigger request itself. That also means there's no multi-consumer race to guard against (no `find_one_and_update` claim needed, unlike a poll-based design) — the caller already decided which job this call is for.

**Code sharing — reversed, now fully independent (revised this round):** the original design had the render service live as a subpackage inside the `backend/` tree, importing `database.py`/`storage_service.py`/`services/groq_service.py`/`models/video_overview.py` directly from the API's own copies, with a Docker build context scoped to all of `backend/` so those sibling files were reachable. That's been reversed on request — the service is now **fully self-contained** and lives as `video_service/`, a top-level directory (not nested under `backend/` at all): it has its own `database.py`, `storage_service.py`, `services/groq_service.py`, and `models/video_overview.py`, each a trimmed copy (only the functions/fields this service actually calls, not a full duplicate of the API's versions) rather than a shared import. The Docker build context is `video_service/` itself, so nothing outside that folder is even reachable by `COPY`, let alone imported.

**The tradeoff, stated plainly:** this trades a single source of truth for full deploy independence. If `database.py`'s indexing logic or `storage_service.py`'s B2 config changes on the API side, the render service's copies don't pick that up automatically — they need updating by hand. Verified this round that both copies are genuinely independent: ran the render service's imports and its FastAPI app with `video_service/` as the working directory and `backend/` nowhere on `sys.path`, confirmed every import (`database`, `storage_service`, `services.groq_service`, `models.video_overview`, the Jinja template rendering) resolves to the local copy, not the API's.

What each trimmed copy drops versus the API's version, and why:
- `database.py` — no index creation (`connect_to_mongo()` just connects). The API is always running and already owns `video_overviews.lesson_id` and every other index; this service only needs a connection.
- `storage_service.py` — only `download_bytes`/`upload_file` (server-side B2 access). Drops `generate_upload_url`/`generate_download_url` (presigned URLs for the browser) — a purely API-side concern.
- `services/groq_service.py` — only `get_llm_for_structured_output()`. Drops `get_llm()`, the AI tutor's short-reply (1024-token) chat instance this service never touches.
- `models/video_overview.py` — only `SlideScript`, `VideoOverviewScript`, `VideoOverviewTrigger`. Drops `VideoOverviewCreate`/`VideoOverviewStatus`, which are the POST endpoint's request-body model and a response type alias — API-only. `SlideScript`/`VideoOverviewScript` must stay shape-identical between both copies, since they describe the same `video_overviews.slide_script` data written by this service and read back by the API.

**Dependency layout (implemented):** `video_service/requirements.txt` is a single **flat, self-contained** file — `motor`, `python-dotenv`, `certifi`, `boto3`, `langchain-groq`, `fastapi`, `uvicorn[standard]`, `gTTS`, `playwright`, `pypdf`, `jinja2` — no `-r` include to anything outside the folder. `backend/requirements-common.txt`/`requirements-api.txt` still exist as local-dev/documentation references for the **API side only**; `requirements-worker.txt` (the original third file in that split, back when the service lived at `backend/render_service/`) is gone — superseded entirely by `video_service/requirements.txt`.

No package in the original `requirements.txt` was found to be dead/unused across the whole reorganization — every one traces to a real, currently-used import (verified by grep, not assumed).

**Correction, found via a real failed deploy:** at one point `backend/requirements.txt` was a one-line `-r requirements-api.txt` redirect. That resolves fine with plain `pip` locally, but FastAPI Cloud's build pipeline (`uv`-based) stages `requirements.txt` in isolation during an early dependency-resolution step, before the rest of the repo — including sibling files like `requirements-api.txt` — is copied in. The actual build error: `Error parsing included file in \`requirements.txt\`... failed to read from file \`requirements-api.txt\`: No such file or directory`. Fix: `backend/requirements.txt` is the full API package list **inlined directly**, kept in sync by hand with `requirements-common.txt`/`requirements-api.txt` (confirmed identical via a diff of the package sets). This is the same lesson `video_service/requirements.txt` was built around from the start — no `-r` include should ever point outside whatever single directory the actual build/deploy step stages in isolation.

Validated: `pip install -r requirements.txt --dry-run` (both the flat API file and `video_service`'s flat file) resolves cleanly with no missing packages. A full `docker build` was later run for real (twice — once locally once Docker Desktop was available, and once via Render's build pipeline before the deploy target moved) and succeeded, including the `apt-get install ffmpeg` and `playwright install --with-deps chromium` layers — confirming the dependency list and Dockerfile are correct. The subsequent OOM issue was a runtime memory problem, not a build/dependency problem.

---

## 2. Data model

New collection: **`video_overviews`**, named and shaped to match the existing `resources`/`live_sessions` conventions (`database.py`, `models/resource.py`, `models/lms.py`).

```python
# models/video_overview.py (new file)
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

class SlideScript(BaseModel):
    title: str
    bullets: List[str] = Field(max_length=6)
    narration: str

class VideoOverviewScript(BaseModel):
    slides: List[SlideScript] = Field(min_length=2, max_length=12)

class VideoOverviewCreate(BaseModel):
    prompt: str
    source_resource_id: Optional[str] = None  # existing lesson PDF to ground on

VideoOverviewStatus = Literal[
    "queued", "scripting", "narrating", "rendering", "assembling", "uploading",
    "ready", "failed",
]
```

Mongo document shape (mirrors `resources` field naming: `lesson_id`, `uploaded_by`→`requested_by`, `b2_key`, `status`; mirrors `live_sessions`' richer async-status lifecycle):

```python
{
  "_id": ObjectId,
  "lesson_id": ObjectId,                 # same field name/type as resources.lesson_id
  "requested_by": "<firebase_uid>",      # same convention as resources.uploaded_by
  "prompt": "summarize this lesson on quantum entanglement",
  "source_resource_id": ObjectId | None, # optional grounding PDF, must be a confirmed resource on the same lesson
  "status": "queued",                    # VideoOverviewStatus
  "error": None,                         # populated on status="failed"
  "slide_script": None,                  # populated after the "scripting" step; list[SlideScript]-shaped dicts, kept for debugging/retry
  "resource_id": None,                   # populated with the new `resources` _id once status="ready"
  "b2_key": None,                        # mirrors resources.b2_key, set right before the resources doc is created
  "created_at": datetime,
  "updated_at": datetime,
}
```

Index to add in `database.py::connect_to_mongo`, next to the existing `resources.lesson_id` index (line 35):
```python
await db_instance.db.video_overviews.create_index("lesson_id")
```

No new fields needed on the existing `resources` collection — the finished video is inserted there exactly like any other resource, with `resource_type: "video"` (already a supported type — see `PDF_ONLY_TYPES` in `routers/educator.py:134`, which only restricts `ppt`/`notes`/`cheatsheet`; `video` already allows arbitrary video content types).

---

## 3. Generation pipeline

All of this is **lower-risk than the planned Manim generator**: the LLM only ever produces JSON validated against `VideoOverviewScript` before use — no generated code is executed, no sandboxing/Docker isolation is needed. Treat this explicitly as a "fast path" feature.

**Step 1 — Slide script generation (LLM)**
- Reuse `services/groq_service.py::groq_service.get_llm()` (same `ChatGroq` instance already used by the AI tutor) — no new LLM provider/service needed.
- Use LangChain's structured-output binding (`llm.with_structured_output(VideoOverviewScript)`) so the model is constrained to the Pydantic schema; validate again on the way out regardless (never trust structured-output guarantees blindly).
- Prompt includes: the educator's free-text prompt, optional extracted PDF text (Step 2), and hard caps stated explicitly in the system prompt (max 12 slides, max 6 bullets/slide, narration length target ~30-45s of spoken audio per slide) to bound downstream TTS/render/ffmpeg cost.
- Persist the validated script to `video_overviews.slide_script` immediately — this makes the job resumable/debuggable without re-calling the LLM if a later step fails.

**Step 2 — Optional PDF grounding**
- Only runs if `source_resource_id` is provided. Look it up in `resources` (must belong to the same `lesson_id`, `status == "confirmed"`, mirroring the ownership pattern in `routers/default.py::resolve_course_id_from_resource`).
- Needs a new dependency: **`pypdf`** (pure-Python, MIT license — prefer this over PyMuPDF, which is AGPL and only happened to be present on this dev machine's unrelated global Python, not a real project dependency).
- Needs a new `storage_service.py` helper to fetch object bytes server-side — today `storage_service.py` only generates presigned URLs (`generate_upload_url`, `generate_download_url`), there is no "read this object" function. Add:
  ```python
  def download_bytes(key: str) -> bytes:
      obj = s3_client.get_object(Bucket=B2_BUCKET_NAME, Key=key)
      return obj["Body"].read()
  ```
- Extract text with `pypdf.PdfReader`, truncate to a token-safe length, pass into the Step 1 prompt as grounding context.

**Step 3 — Per-slide TTS narration**
- `gTTS` (unofficial, free, no API key — flagged as an open question below re: rate-limiting reliability) renders each slide's `narration` string to an mp3.
- Need each clip's duration to know how long to hold the slide image. Rather than adding `mutagen` as a new dependency, use `ffprobe` (ships with `ffmpeg`, already a required system binary) to read duration — one less pip dependency.

**Step 4 — HTML → PNG slide rendering**
- New Jinja2 template (`backend/templates/video_overview_slide.html` or similar) rendering `{title, bullets}` into a static HTML page. Jinja2 is already available (§1).
- Since this template is rendered standalone via headless Chromium (not through the Vite/React build), it **cannot reuse Tailwind utility classes** — the actual design tokens confirmed in `frontend/src/index.css` must be hardcoded as plain CSS: primary `#8b00ff`, dark background `#000000`/`oklch(0.141 0.005 285.823)`, emerald accent (`#10b981`-ish) for highlights, Geist Sans for body text (self-host the same `@fontsource/geist-sans` woff2 files or embed via `@font-face` + base64), translucent `border-white/10`-style borders for the glass look. This is a real duplication point — if the React design tokens change later, this template needs manual re-sync; there's no shared source of truth across the Python/React boundary.
- Render to PNG via Playwright (`page.screenshot()`) at a fixed viewport, e.g. 1920×1080. Requires:
  - New dependency: `playwright` (Python package), render-service-only (see §1a)
  - A `playwright install --with-deps chromium` step in the render service's Dockerfile — downloads a ~300MB browser + OS-level shared library dependencies. Runs at image build time, not deploy time, since the render service is Docker-based; not applicable to FastAPI Cloud.

**Step 5 — ffmpeg assembly**
- Per slide: `ffmpeg -loop 1 -i slide_N.png -i narration_N.mp3 -c:v libx264 -tune stillimage -c:a aac -pix_fmt yuv420p -shortest slide_N.mp4`
- Concatenate all per-slide clips via ffmpeg's concat demuxer into one final mp4.
- Shell out via `subprocess`, matching the style already used for `qiskit`/`code_execution_service.py`-style subprocess calls if any exist (verify at implementation time) — otherwise a plain `subprocess.run(..., check=True)`.

**Step 6 — Upload + resource registration**
- Needs a new `storage_service.py` helper — today only presigned-URL generation exists, no server-side "upload this local file" function:
  ```python
  def upload_file(local_path: str, key: str, content_type: str) -> None:
      s3_client.upload_file(local_path, B2_BUCKET_NAME, key, ExtraArgs={"ContentType": content_type})
  ```
- Key convention matches the existing pattern in `routers/educator.py:138` (`f"{resource_type}/{lesson_id}/{filename}"`), e.g. `video/{lesson_id}/{video_overview_id}_overview.mp4`.
- Insert directly into `resources` with `status: "confirmed"` (skipping the presigned-PUT-then-confirm dance used for browser uploads, since the backend itself did the upload) — field shape copied exactly from the metadata dict in `routers/educator.py:141-151`, with `resource_type: "video"`.
- Update the `video_overviews` doc: `status: "ready"`, `resource_id`, `b2_key`.

---

## 4. Backend endpoints

New file: `backend/routers/video_overview_router.py`, `/api` prefix, tag `"Video Overview"` — matches every other router (`educator.py`, `default.py`, `live.py`). Runs on FastAPI Cloud. These endpoints only ever touch MongoDB plus one outbound HTTP call — no rendering code, no ffmpeg/Playwright imports, so they carry zero new dependencies into `backend/requirements.txt` (`httpx` is already a transitive dependency, §1).

The create endpoint must insert the job **and** trigger the render service **and** return to the frontend immediately, without using FastAPI's `BackgroundTasks` (architecture decision this round). The render service holds its HTTP connection open for the full 5–10 minute render and only responds when the job is done (§5) — that response isn't something this endpoint needs or waits for, since the frontend gets status from MongoDB via the separate `GET` endpoint below, not from this call's result. So the trigger call is scheduled as a bare `asyncio.create_task(...)` — a fire-and-forget notification, not the FastAPI `BackgroundTasks` primitive — and the endpoint returns as soon as the Mongo insert completes:

```python
import asyncio, os, httpx

router = APIRouter(prefix="/api", tags=["Video Overview"])

RENDER_SERVICE_URL = os.getenv("RENDER_SERVICE_URL")        # e.g. https://qrious-video-render.onrender.com
RENDER_SERVICE_SECRET = os.getenv("RENDER_SERVICE_SECRET")  # shared secret — see §7

@router.post("/lessons/{lesson_id}/video-overviews")
async def create_video_overview(
    lesson_id: str,
    data: VideoOverviewCreate,
    course=Depends(require_lesson_owner),   # reused from routers.educator — same dep as the resource upload-url endpoint
    user=Depends(get_current_user),
):
    db = get_db()
    doc = {
        "lesson_id": ObjectId(lesson_id),
        "requested_by": user["firebase_uid"],
        "prompt": data.prompt,
        "source_resource_id": ObjectId(data.source_resource_id) if data.source_resource_id else None,
        "status": "queued",
        "error": None, "slide_script": None, "resource_id": None, "b2_key": None,
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc),
    }
    result = await db.video_overviews.insert_one(doc)
    video_overview_id = str(result.inserted_id)

    asyncio.create_task(_trigger_render_service(video_overview_id))  # fire-and-forget, not BackgroundTasks
    return {"video_overview_id": video_overview_id}

async def _trigger_render_service(video_overview_id: str):
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            await client.post(
                f"{RENDER_SERVICE_URL}/internal/video-overview",
                json={"video_overview_id": video_overview_id},
                headers={"X-Internal-Secret": RENDER_SERVICE_SECRET},
            )
        except httpx.HTTPError:
            pass  # render service unreachable/cold-starting — job stays "queued"; no retry sweep in v1, see §5

@router.get("/video-overviews/{video_overview_id}")
async def get_video_overview_status(
    video_overview_id: str,
    user=Depends(get_current_user),
):
    ...  # resolve lesson_id -> course, reuse require_course_access-style check (owner only, mirrors resolve_course_id_from_resource)
    # reads straight from MongoDB — the render service is what wrote these fields, not this endpoint
    # returns {status, error, resource_id, slide_script}

@router.get("/lessons/{lesson_id}/video-overviews")
async def list_video_overviews(lesson_id: str, course=Depends(require_lesson_owner)):
    ...  # optional, for showing past attempts
```

Register in `main.py` next to the other routers (line ~64):
```python
from routers.video_overview_router import router as video_overview_router
...
app.include_router(video_overview_router)
```

`require_lesson_owner` is imported straight from `routers/educator.py` (already imported cross-router by `routers/live.py:7` for `require_course_owner` — same pattern, no need to duplicate the check).

**On the `asyncio.create_task` caveat, stated plainly:** like `BackgroundTasks`, this fire-and-forget task is tied to the FastAPI Cloud process — if the process restarts in the split second between the Mongo insert and the task actually firing, the trigger call is lost and the job sits at `"queued"` forever with nothing to advance it. This is a real but narrow window (the task is scheduled essentially immediately after insert, not after a slow operation), and it's the tradeoff of avoiding `BackgroundTasks` specifically here — worth knowing about, not a blocker for v1.

---

## 5. Rendering service (`video_service`, HTTP-triggered — not a polling worker)

**No Celery/Redis exists anywhere in this repo, and nothing else in the codebase runs background jobs either** — code execution (`code_playground_router.py`) is fully synchronous, and the one genuinely async pipeline (live-session recording, `routers/live.py`) is event-driven via LiveKit's egress + a webhook callback (`/webhooks/livekit`), not an in-process worker or polling loop. There is no precedent to extend here — this is new territory for the codebase. Two designs were considered and rejected before landing on this one: FastAPI `BackgroundTasks` running the pipeline itself (rejected — would run inside FastAPI Cloud, which can't install ffmpeg/Chromium at all) and a continuously-polling Background Worker (rejected — bills for uptime it doesn't need, and a poll loop doesn't fit a request-driven design as cleanly). Note: `BackgroundTasks` *is* used in the final implementation, but only for the lightweight trigger call itself (§4) — the actual rendering still never runs inside FastAPI Cloud.

**Design:** `video_service/main.py` is a small standalone HTTP app (FastAPI) with no need for the full API app's routers/middleware, run as its own Docker container independent of FastAPI Cloud (currently: locally via `docker run`, see `DEPLOYMENT.md`). It exposes exactly one endpoint:

```python
@app.post("/internal/video-overview")
async def render_video_overview(payload: TriggerPayload, x_internal_secret: str = Header(...)):
    if x_internal_secret != RENDER_SERVICE_SECRET:          # shared secret — see §7
        raise HTTPException(status_code=401)

    db = get_db()
    job = await db.video_overviews.find_one({"_id": ObjectId(payload.video_overview_id)})
    if job is None:
        raise HTTPException(status_code=404)

    result = await run_pipeline(job)   # advances status through scripting -> narrating ->
                                        # rendering -> assembling -> uploading -> ready/failed,
                                        # writing each transition to `video_overviews` as it goes
    return {"status": result["status"], "resource_id": result.get("resource_id"), "error": result.get("error")}
```

- **No poll loop, no `find_one_and_update` claim.** The caller (FastAPI Cloud) already decided exactly which job this request is for — there's no multi-consumer race to guard against the way a poll-based design would need to.
- Processes **exactly one job per request**, synchronously, for the whole 5–10 minute duration. Running locally via `docker run`, the process just stays up for as long as the container runs — no tier/timeout consideration at all (this constraint mattered when the target was Render's Free tier; it's moot now).
- Uses its own trimmed copies of `database.py::get_db()`, `storage_service.py`, and `services/groq_service.py` — not shared with the API (see §1a for the full-isolation design and what each copy drops).
- Every pipeline step (§3) writes its status transition back to the `video_overviews` doc immediately as it happens, so a crash mid-render (or the request timing out) leaves an accurate `status` + `error` rather than a silently stuck `"queued"` row. There's no automatic retry/resume in v1 — if a job is left stuck, an educator re-submitting creates a fresh `video_overviews` doc. A stuck-row sweep is a reasonable v2 addition, not required for the happy path.
- Frontend polls `GET /api/video-overviews/{id}` (served by FastAPI Cloud, reading the same Mongo doc the render service is writing) on an interval (plain `setInterval`, ~3s) until `status` is `"ready"` or `"failed"` — this exact mechanism (interval-driven polling in a `useEffect`) already exists in the codebase for a different purpose (`DebuggerPanel.tsx:44`), so it's a repo-consistent choice even though nothing currently polls a *backend* status endpoint this way. The frontend has no idea the render service exists — it only ever talks to FastAPI Cloud, and the render service's own HTTP response (back to FastAPI Cloud) is not part of that path at all.

---

## 6. Frontend component

New file: `frontend/src/api/videoOverviews.ts`, following `frontend/src/api/resources.ts` conventions exactly — same `getApiUrl()`, same `getAuthHeaders()` (Firebase `getIdToken()`), same fetch-and-throw-on-`!response.ok` shape:
```typescript
export async function requestVideoOverview(lessonId: string, prompt: string, sourceResourceId?: string): Promise<{ video_overview_id: string }>
export async function getVideoOverviewStatus(id: string): Promise<{ status: VideoOverviewStatus; error?: string; resource_id?: string }>
```

New component: `frontend/src/components/VideoOverviewGenerator.tsx`, following `ResourceUpload.tsx`'s explicit state-machine pattern (`idle | submitting | polling | success | error`, with a `failedStep`-style field for granular retry), reusing the same shadcn primitives (`Card`, `Button`, `Input`, `Progress`) and the same visual language (`animate-in fade-in slide-in-from-bottom-4 duration-500`, `w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin` spinner, emerald success icon).

Once `status === "ready"` and `resource_id` is populated, render the **existing, unmodified** `VideoResourcePlayer` (`frontend/src/components/VideoResourcePlayer.tsx`) with that `resource_id` — this is the payoff of reusing the `resources` collection and `resource_type: "video"`: zero new video-playback code is needed, the generated overview plays through exactly the same presigned-URL-with-auto-retry player every other lecture video uses.

---

## 7. Open questions / explicit unknowns

**Resolved this round:**

- ~~ffmpeg on the production host~~ — resolved: moves entirely into `video_service`'s own Docker image (§1a), never needs to exist on FastAPI Cloud.
- ~~Headless Chromium on the production host~~ — resolved: same as above, installed via `playwright install --with-deps chromium` in the Dockerfile.
- ~~LLM provider confirmation~~ — resolved: Groq only, reuse `services/groq_service.py` as-is.
- ~~PDF extraction dependency~~ — resolved: `pypdf` (MIT), added to `video_service` only, not `backend/requirements.txt`.
- ~~Multi-instance job ownership~~ — resolved differently than first proposed: no longer needs an atomic `find_one_and_update` claim, because there's no poller racing for work — FastAPI Cloud specifies exactly which job each HTTP call is for (§1a/§4/§5). The concern this was guarding against (two consumers grabbing the same queued job) doesn't exist in a request-driven design.
- ~~Docker image size/build time~~ — resolved: `video_service`'s fully self-contained `requirements.txt` (§1a) means its image installs only `motor`, `python-dotenv`, `certifi`, `boto3`, `langchain-groq`, `fastapi`, `uvicorn[standard]`, `gTTS`, `playwright`, `pypdf`, `jinja2` — verified by dry-run that qiskit/torch/chromadb/sentence-transformers/firebase-admin/livekit-api do not appear in that graph at all. Also confirmed in practice: a real Docker build (`apt-get install ffmpeg` + `playwright install --with-deps chromium`, ~177MB Chromium download) completed successfully in a couple of minutes. Image size/build time were never actually the problem — see the next item.
- ~~Background Worker vs. request-driven execution model~~ — resolved: replaced the polling Background Worker design with an HTTP-triggered service (§1a/§4/§5) — no queue/broker infra, no poll loop, no multi-consumer coordination needed regardless of host.
- ~~Render instance sizing~~ — **answered empirically, the hard way.** Deployed to Render's Free tier (512MB RAM) and ran real test jobs. Full log analysis (same container instance ID, a fresh "Started server process" boot sequence 48 seconds after the last log line, zero error ever written) pointed conclusively at an OOM kill during the `ffmpeg` encode step, right after Chromium had been used for screenshots. Free tier's 512MB was **not** sufficient. Rather than pay for a bigger Render plan or provision alternative cloud infrastructure (an Oracle Cloud VM was briefly considered), the MVP decision was to **run `video_service` locally via Docker** instead — sidestepping the sizing question entirely for now. Revisit if/when this needs a real always-on deployment.
- ~~Internal authentication between FastAPI Cloud and `video_service`~~ — resolved and working: a shared secret (`RENDER_SERVICE_SECRET`) sent as an `X-Internal-Secret` header, checked on `video_service`'s side. For local Docker, both sides just need the same value in their respective `.env` files (`video_service/.env` and `backend/.env`) — see `DEPLOYMENT.md`. No platform-specific provisioning needed anymore since there's no platform.

**Still open:**

1. **gTTS reliability** — it's an unofficial wrapper around Google Translate's TTS endpoint (no API key, but also no SLA and known to occasionally break/rate-limit). Acceptable for the MVP, or worth budgeting for a metered TTS API later?
2. **Test data** — does any lesson currently have a confirmed PDF resource (`ppt`/`notes`/`cheatsheet`) to actually test the grounding path against? Can't tell from static code; needs a check against the live database or a manual upload during dev.
3. **Cloud deployment, deferred not solved** — running locally is fine for an MVP demo but doesn't scale to real users (someone has to keep a machine running with Docker up, reachable by FastAPI Cloud). When this needs to go further than a demo, revisit hosting (Render on a paid plan, Oracle Cloud VM, Google Cloud Run/Compute Engine — see `DEPLOYMENT.md`'s closing section) with the now-confirmed memory requirement in mind (>512MB, exact number not yet measured — would be worth profiling peak RSS during a real render before picking a plan size).

---

## Summary of new dependencies

**`video_service` only**, in `video_service/requirements.txt` (implemented, flat and self-contained — see §1a for the full-isolation design; never installed on FastAPI Cloud):

| Package | Purpose | License note |
|---|---|---|
| `motor`, `python-dotenv`, `certifi`, `boto3`, `langchain-groq` | this service's own trimmed `database.py`/`storage_service.py`/`groq_service.py` copies | not shared with the API's copies — see §1a |
| `fastapi`, `uvicorn[standard]` | this service is its own small FastAPI app | bare `fastapi`, not `[standard]` — see §1a for why |
| `gTTS` | narration audio | unofficial/free, no key |
| `playwright` (+ `playwright install --with-deps chromium` in the Dockerfile) | HTML→PNG slide screenshots | works in Docker regardless of host — confirmed via a real successful build |
| `pypdf` | optional PDF text grounding | MIT, preferred over PyMuPDF (AGPL) |
| `jinja2` | slide HTML templating | pinned explicitly — this service doesn't install fastapi[standard], which is where it'd otherwise come from transitively |
| *(ffmpeg)* | system binary, not pip — installed via the Dockerfile (`apt-get install -y ffmpeg`) | works in Docker regardless of host — confirmed via a real successful build |

**`backend/requirements.txt` (FastAPI Cloud): unchanged in substance.** Full API package list inlined directly (not a `-r` include — see §1a's "Correction" for why FastAPI Cloud specifically requires this) — same packages install, same command works, zero rendering dependency added to the API image, and nothing in it is shared with or read by `video_service` anymore.
