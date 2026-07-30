# Fully self-contained — build context is THIS folder (qstudio_service/, a top-level
# sibling of backend/ and frontend/, renamed from video_service/ now that it hosts
# more than video — see PLANS/qstudio.md §0a), not backend/. Nothing here reaches
# outside this directory; database.py, storage_service.py, ai/ (the Multi-AI Gateway,
# backend/docs/AI_GATEWAY.md), and models/video_overview.py are this service's own
# trimmed copies, not shared with the FastAPI Cloud API. See DEPLOYMENT.md for how to
# run this locally (current MVP
# setup — no cloud deploy target yet, plain `docker build` + `docker run` on your own
# machine).
#
#   docker build -t qrious-qstudio-service .   (run from inside qstudio_service/)
#
FROM python:3.11-slim

WORKDIR /app

# System deps: ffmpeg for video assembly, plus what Playwright's Chromium needs.
#
# libcairo2-dev/libpango1.0-dev/pkg-config/build-essential are here for Manim's
# manimpango/pycairo (pipeline_manim.py / manim_scenes.py, PLANS/qstudio-
# animation.md) — added defensively, not confirmed necessary: manimpango/
# pycairo often ship prebuilt manylinux wheels that wouldn't need any of this,
# but that was only verified against Windows wheels locally (no Linux Docker
# build available in that environment either), so this errs toward "the build
# succeeds even if wheels aren't available" over minimal image size. Revisit
# once someone actually runs this build (§8 Q6) — these four packages are the
# first candidates to drop if the wheels turn out to cover everything.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        pkg-config \
        libcairo2-dev \
        libpango1.0-dev \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

COPY . .

EXPOSE 8080
# Shell form (not JSON array) so $PORT actually expands. Defaults to 8080; pass
# -e PORT=xxxx to `docker run` to override (e.g. to match a reverse proxy upstream).
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
