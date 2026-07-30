# Running the qStudio Service (MVP — Local Docker, No Cloud Deploy Yet)

> **Renamed from `video_service/`.** This directory now hosts every qStudio output
> that needs ffmpeg/Chromium (Video Overview, and Audio Overview/Slides as they're
> added), not just video — see `PLANS/qstudio.md` §0a. The env vars are now
> `QSTUDIO_SERVICE_URL`/`QSTUDIO_SERVICE_SECRET` (previously `QSTUDIO_SERVICE_URL`/
> `QSTUDIO_SERVICE_SECRET`). Everything below is otherwise unchanged — same Docker
> setup, same request-driven design, same local-only MVP status.

**Current status:** `qstudio_service/` (the AI video-overview rendering pipeline) is not deployed to any cloud host. For this milestone it runs **locally via Docker** and gets demoed that way — this is a deliberate MVP decision, not a placeholder-because-we-forgot. (It was briefly deployed to Render, but Render's Free tier's 512MB RAM ceiling couldn't handle Chromium + `ffmpeg` running back-to-back — the container got OOM-killed mid-render. Rather than pay for a bigger plan or provision cloud infrastructure before it's needed, the MVP simply runs it locally.)

See [`PLANS/video-overview-generator.md`](./PLANS/video-overview-generator.md) for the full architecture and design rationale. This doc is just "how to actually run it."

---

## Why it's a separate service at all

FastAPI Cloud (the main API) can't install arbitrary OS packages — no Docker, no `apt-get`. This pipeline needs `ffmpeg` and headless Chromium (via Playwright), both real OS-level dependencies. So rendering lives in `qstudio_service/`: a fully independent codebase (own `requirements.txt`, own Dockerfile, own trimmed copies of `database.py`/`storage_service.py`/`groq_service.py`) that FastAPI Cloud calls over HTTP for each job. See `PLANS/video-overview-generator.md` §1a for why it's request-driven (not a polling worker) and why it doesn't share code with the API.

---

## Option A — Full local stack (recommended for a demo)

Everything on your own machine: frontend, API, and video service. No tunnel, no dependency on any deployed host being reachable — the most reliable setup for an in-person or screen-shared demo.

**1. Video service (Docker):**
```bash
cd qstudio_service
cp .env.example .env
# edit .env: fill in real MONGODB_URI, B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY,
# B2_BUCKET_NAME, GROQ_API_KEY (same values as backend/.env), and make up any
# random string for QSTUDIO_SERVICE_SECRET — e.g. `openssl rand -hex 32`

docker compose up --build -d
```
(Plain `docker build -t qrious-video-service .` + `docker run --rm -p 8080:8080 --env-file .env qrious-video-service` also works if you'd rather not use compose — `docker-compose.yml` just wraps the same thing with a named container, log rotation, and `restart: unless-stopped`.)

Verify it's up:
```bash
curl http://localhost:8080/health
# -> {"status":"healthy"}
```

**Viewing logs:** the code logs every pipeline step (request received, `-> scripting`, `-> narrating`, `ffmpeg: encoding clip 1/3`, etc. — see `main.py`/`pipeline.py`), so `docker logs` is the primary way to see a job actually progress, not just guesswork from the frontend's polling UI:
```bash
docker compose logs -f              # follow, all history
docker compose logs -f --tail 50    # follow, starting from the last 50 lines
docker compose logs                 # one-shot dump, no follow
```
Logs are capped at ~30MB total (`docker-compose.yml`'s `logging.options`: 10MB × 3 files, rotating) so a long-running local dev session doesn't fill your disk.

**2. Backend API:** add two lines to `backend/.env` (the exact same `QSTUDIO_SERVICE_SECRET` value you just put in `qstudio_service/.env`):
```
QSTUDIO_SERVICE_URL=http://localhost:8080
QSTUDIO_SERVICE_SECRET=<the same random string from step 1>
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

**4. Demo it:** two ways to trigger a job, both going through the same pipeline:
- **Student-facing, standalone:** log in as any user (student or educator), click the **AI Video Overview** tab in the sidebar (`/video-overview`) — a ChatGPT-style prompt box, no course/lesson needed.
- **Educator, lesson-scoped:** log in as an educator, open a lesson in `CourseEditor`, click **Generate Video Overview** — can optionally ground the script in an existing lesson PDF, and the finished video is added to that lesson's resources.

Either way, watch it progress `queued → scripting → narrating → rendering → assembling → uploading → ready` (polls every ~3s) and plays inline once done.

**Note:** both entry points check `import.meta.env.PROD` (Vite's prod-build flag) and render a static "local-only feature" notice instead of the generator when the frontend itself is a production build (i.e. the deployed Vercel site) — since `QSTUDIO_SERVICE_URL` on a deployed API has nothing reachable to point at, a submitted job would otherwise just spin at "queued" forever. Running the frontend via `npm run dev` (as in this option) is not a production build, so the real generator renders normally.

All three need to be running simultaneously. The video service runs detached (`-d`) in the background — stop it with `docker compose down` (run from `qstudio_service/`) when you're done; the backend/frontend terminals need `Ctrl+C` as usual.

---

## Option B — Keep the deployed API/frontend, only run the video service locally

If you'd rather keep using the already-deployed FastAPI Cloud + Vercel frontend and just point them at a locally-running video service, you need a tunnel — FastAPI Cloud's servers can't reach `localhost` on your machine directly.

1. Run the video service exactly as in Option A step 1.
2. Expose it publicly with a tunnel, e.g. [ngrok](https://ngrok.com):
   ```bash
   ngrok http 8080
   ```
   Copy the `https://....ngrok-free.app` URL it gives you.
3. On FastAPI Cloud's actual env var config (dashboard or `fastapi-cloud-cli`), set:
   - `QSTUDIO_SERVICE_URL` = the ngrok URL
   - `QSTUDIO_SERVICE_SECRET` = the same value you put in `qstudio_service/.env`
4. Test through the live deployed frontend as normal.

Caveat: the tunnel URL changes every time you restart ngrok (unless you're on a paid ngrok plan with a reserved domain), so you'll need to update FastAPI Cloud's env var each time. This is why Option A is the better default for a demo — nothing to keep in sync.

---

## Local testing without running the full pipeline

You don't need Docker/ffmpeg/Chromium to test the AI logic in isolation. Useful for iterating on the prompt (`SYSTEM_PROMPT` in `qstudio_service/pipeline.py`) quickly:
```python
# run from qstudio_service/, with real credentials in qstudio_service/.env or exported
import asyncio, sys
sys.path.insert(0, ".")
from pipeline import _generate_slide_script
result = asyncio.run(_generate_slide_script("your test prompt here", None))
for s in result.slides:
    print(s.title, "-", len(s.narration.split()), "words")
```
This calls Groq and validates the response against the `VideoOverviewScript` schema, without touching edge-tts, Playwright, or ffmpeg at all.

---

## If you revisit cloud deployment later

The `Dockerfile` in `qstudio_service/` is host-agnostic — `docker build` + `docker run` works identically on Render, an Oracle Cloud VM, a Google Cloud Run/Compute Engine instance, or any other Docker-capable host. The only two things any future host needs are: (1) enough RAM to run Chromium + `ffmpeg` together (512MB was not enough on Render's Free tier — budget for more), and (2) the same six env vars used above (`MONGODB_URI`, `B2_ENDPOINT`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `GROQ_API_KEY`, `QSTUDIO_SERVICE_SECRET`).
