# Fully self-contained — build context is THIS folder (notebook_service/, a top-level
# sibling of backend/, frontend/, and video_service/). Nothing here reaches outside
# this directory. Unlike video_service, this service never touches MongoDB or B2 (see
# main.py's module docstring) — it only spawns and relays messages to local ipykernel
# processes, so there's no database.py/storage_service.py to trim a copy of here.
#
#   docker build -t qbook-notebook-service .   (run from inside notebook_service/)
#
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Registers the ipykernel kernelspec for THIS interpreter (the one requirements.txt was
# just installed into, qiskit/qiskit-aer/matplotlib/numpy included) so
# AsyncKernelManager(kernel_name="python3") in kernel_manager.py has something to launch.
RUN python -m ipykernel install --name python3 --display-name "Python 3 (qBook)"

COPY . .

# Run as a non-root user — this process executes arbitrary, untrusted student
# Python (deliberately no import blocklist, see PLANS/qbook.md §1), so it shouldn't
# run as root by default. Kernels inherit this user via fork, so student code loses
# nothing it needs (site-packages stays readable, subprocesses still work) but
# doesn't get root's reach if this container's isolation is ever bypassed some
# other way.
RUN useradd --create-home --home-dir /home/qbook --shell /usr/sbin/nologin qbook \
    && chown -R qbook:qbook /app
USER qbook
ENV HOME=/home/qbook

EXPOSE 8081
# Shell form (not JSON array) so $PORT actually expands. Defaults to 8081, not the
# more obvious 8080 — video_service already defaults to 8080, so this keeps the
# two apart by convention even outside docker-compose (plain `docker run`, or
# running uvicorn directly). Pass -e PORT=xxxx to `docker run` to override.
#
# --ws-max-size raises uvicorn's default 1 MiB WebSocket message cap. A single
# cell output (e.g. a base64 image/png from qc.draw('mpl') on a large circuit,
# or any matplotlib figure) can exceed 1 MiB on its own — the default would make
# main.py's send_json for that one output raise, which (before the error handling
# added around _run_cell) killed the whole session with nothing shown to the
# student. 16 MiB comfortably covers realistic circuit/plot output.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8081} --ws-max-size 16777216