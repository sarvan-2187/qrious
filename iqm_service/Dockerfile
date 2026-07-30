# Fully self-contained — build context is THIS folder (iqm_service/, a top-level
# sibling of backend/ and frontend/). This is the ONE place in the whole system that
# ever installs qiskit-iqm (which pins qiskit<1.3) — isolating it here is the entire
# point, see ../PLANS/iqm-service.md.
#
#   docker build -t qrious-iqm-service .   (run from inside iqm_service/)
#
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8082
# Shell form (not JSON array) so $PORT actually expands. Defaults to 8082 — 8080 is
# video_service, 8081 is notebook_service (see root README.md's port convention).
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8082}
