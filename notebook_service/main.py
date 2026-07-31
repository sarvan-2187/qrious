"""Qrious qBook — kernel-execution service.

Internal, WebSocket-driven service that runs student Python/Qiskit code for qBook
notebooks. Not user-facing on its own: the frontend only ever reaches this over
WebSocket with a short-lived signed token minted by
backend/routers/qbook_router.py's POST /notebooks/{id}/session. See PLANS/qbook.md
§0-§1 for the full design.

Deliberately owns no database connection of any kind (no MongoDB, no Firebase) —
notebook content (cells, outputs, titles) is persisted by the frontend calling
backend/ directly, right after a cell finishes streaming here. This service only
ever holds ephemeral kernel processes in memory.
"""

import asyncio
import os
import queue
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect

from auth import InvalidSessionToken, verify_session_token
from kernel_manager import CapacityError, KernelSession, KernelSessionManager, write_dataset

MAX_CONCURRENT_KERNELS = int(os.getenv("QBOOK_MAX_KERNELS", "20"))
MAX_KERNELS_PER_UID = int(os.getenv("QBOOK_MAX_KERNELS_PER_UID", "3"))
IDLE_TIMEOUT_SECONDS = int(os.getenv("QBOOK_IDLE_TIMEOUT_SECONDS", "1200"))
EXEC_TIMEOUT_SECONDS = int(os.getenv("QBOOK_EXEC_TIMEOUT_SECONDS", "120"))

sessions = KernelSessionManager(
    max_kernels=MAX_CONCURRENT_KERNELS,
    idle_timeout_seconds=IDLE_TIMEOUT_SECONDS,
    max_kernels_per_uid=MAX_KERNELS_PER_UID,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    reaper_task = asyncio.create_task(sessions.reap_idle_loop())
    yield
    reaper_task.cancel()
    await sessions.shutdown_all()


app = FastAPI(
    title="Qrious qBook Notebook Service",
    description="Internal kernel-execution service for qBook. Not reachable without a signed session token issued by the main API.",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "healthy", "active_kernels": sessions.count()}


def _to_output(msg_type: str, content: dict) -> dict | None:
    """Maps a Jupyter iopub message to an nbformat-shaped output object — the same
    shape backend/models/notebook.py's NotebookCell.outputs stores, so the frontend
    can pass what it receives here straight through to its PATCH call unchanged.
    """
    if msg_type == "stream":
        return {"output_type": "stream", "name": content["name"], "text": content["text"]}
    if msg_type == "execute_result":
        return {
            "output_type": "execute_result",
            "data": content["data"],
            # nbformat's schema requires metadata on execute_result/display_data —
            # backend/routers/qbook_router.py's export endpoint 500s without it
            # (nbformat.validator.NotebookValidationError: 'metadata' is a required
            # property), live-reproduced on any cell whose output is an image or
            # other rich display (e.g. qc.draw('mpl')) rather than a plain print().
            "metadata": content.get("metadata") or {},
            "execution_count": content.get("execution_count"),
        }
    if msg_type == "display_data":
        return {
            "output_type": "display_data",
            "data": content["data"],
            "metadata": content.get("metadata") or {},
        }
    if msg_type == "error":
        return {
            "output_type": "error",
            "ename": content["ename"],
            "evalue": content["evalue"],
            "traceback": content["traceback"],
        }
    return None


async def _stdin_relay(websocket: WebSocket, session: KernelSession, cell_id: str, msg_id: str, finished: asyncio.Event) -> None:
    """Drains the kernel's stdin channel for input_request messages — raised by
    e.g. a cell calling input()/getpass() — for the whole duration of the cell's
    run, forwarding each to the browser and blocking until it replies before
    answering the kernel. This is the reason _run_cell is now launched as a
    background task rather than being awaited directly by ws_session's main
    loop (see there): that loop has to keep reading incoming WS messages (this
    reply, or an interrupt) *while* the cell is still running, not after.
    """
    kc = session.kc
    while not finished.is_set():
        try:
            msg = await kc.get_stdin_msg(timeout=1)
        except (asyncio.TimeoutError, queue.Empty):
            continue
        # Only one cell executes at a time (session.busy gates it), but filter
        # by msg_id anyway — same defensive check the iopub loop below already
        # makes — so a stray input_request left over from a just-interrupted
        # previous cell can't get misattributed to this one.
        if msg.get("parent_header", {}).get("msg_id") != msg_id:
            continue
        if msg["msg_type"] != "input_request":
            continue

        content = msg["content"]
        reply_future = asyncio.get_event_loop().create_future()
        session.pending_input = reply_future
        try:
            await websocket.send_json({
                "type": "input_request",
                "cell_id": cell_id,
                "prompt": content.get("prompt", ""),
                "password": bool(content.get("password", False)),
            })
            value = await reply_future
        finally:
            session.pending_input = None
        kc.input(value)


async def _run_cell(websocket: WebSocket, session: KernelSession, cell_id: str, code: str) -> None:
    session.busy = True
    session.touch()
    kc = session.kc
    msg_id = kc.execute(code)
    finished = asyncio.Event()

    async def watchdog():
        # Polls in small ticks rather than one asyncio.sleep(EXEC_TIMEOUT_SECONDS)
        # so it can pause the countdown while session.pending_input is set — a
        # cell blocked on input()/getpass() is legitimately waiting on the
        # student to type something, not hung, and a student can easily take
        # longer than EXEC_TIMEOUT_SECONDS (default 30s) to answer a prompt.
        # Without this, an interactive cell would get auto-interrupted mid-
        # prompt any time the student didn't answer fast enough — live-reproduced
        # before this existed.
        elapsed = 0.0
        tick = 1.0
        while elapsed < EXEC_TIMEOUT_SECONDS:
            await asyncio.sleep(tick)
            if finished.is_set():
                return
            if session.pending_input is None:
                elapsed += tick
        if not finished.is_set():
            # AsyncKernelManager.interrupt_kernel() is a coroutine — calling it
            # without awaiting silently no-ops (the kernel never actually gets
            # interrupted, it just logs an "unawaited coroutine" warning), which
            # was live-verified: a `while True: pass` cell kept running forever
            # after this fired, and the client saw the connection die once the
            # eventual real message-queue timeout below went unhandled.
            await session.km.interrupt_kernel()
            await websocket.send_json({"type": "timeout", "cell_id": cell_id})

    watchdog_task = asyncio.create_task(watchdog())
    stdin_task = asyncio.create_task(_stdin_relay(websocket, session, cell_id, msg_id, finished))
    execution_count = None

    try:
        while True:
            msg = await kc.get_iopub_msg(timeout=EXEC_TIMEOUT_SECONDS + 5)
            if msg.get("parent_header", {}).get("msg_id") != msg_id:
                continue

            msg_type = msg["msg_type"]
            content = msg["content"]

            if msg_type == "execute_input":
                execution_count = content.get("execution_count")
            elif msg_type == "status" and content.get("execution_state") == "idle":
                break
            else:
                output = _to_output(msg_type, content)
                if output is not None:
                    await websocket.send_json({"type": "output", "cell_id": cell_id, "output": output})
    except (asyncio.TimeoutError, queue.Empty):
        # jupyter_client's iopub channel raises queue.Empty on a real timeout, not
        # asyncio.TimeoutError — live-verified via an uncaught queue.Empty
        # traceback that killed the whole ASGI connection (no close frame sent,
        # client saw a raw ConnectionClosedError) the first time this path was
        # actually exercised. Both are caught here since which one fires isn't
        # guaranteed stable across jupyter_client versions/internals.
        pass
    except Exception as exc:
        # Anything else here (an oversized/malformed iopub message, a transient
        # send failure, ...) used to propagate straight out of this function,
        # past ws_session's WebSocketDisconnect-only except clause, and kill the
        # whole connection — the frontend never got execution_done, so the cell
        # was left showing its spinner forever with no output and no error,
        # indistinguishable from a hang. Surfacing it as a cell-level error output
        # instead means the student always sees *something* when a run goes wrong.
        try:
            await websocket.send_json({
                "type": "output",
                "cell_id": cell_id,
                "output": {
                    "output_type": "error",
                    "ename": type(exc).__name__,
                    "evalue": str(exc),
                    "traceback": [],
                },
            })
        except Exception:
            pass
    finally:
        finished.set()
        watchdog_task.cancel()
        stdin_task.cancel()
        session.pending_input = None
        session.busy = False
        session.touch()

    try:
        await websocket.send_json({
            "type": "execution_done",
            "cell_id": cell_id,
            "execution_count": execution_count,
        })
    except Exception:
        # Connection is already gone by this point — nothing left to notify.
        pass


@app.websocket("/ws/session")
async def ws_session(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = verify_session_token(token)
    except InvalidSessionToken:
        await websocket.close(code=4401)
        return

    session_key = f"{payload['uid']}:{payload['notebook_id']}"
    await websocket.accept()

    try:
        session = await sessions.get_or_create(session_key)
    except CapacityError:
        await websocket.send_json({
            "type": "error",
            "message": "qBook is at capacity right now — try again shortly.",
        })
        await websocket.close(code=1013)
        return

    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")

            if msg_type == "execute":
                if session.busy:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Kernel is busy running another cell.",
                    })
                    continue
                # Scheduled as a background task, not awaited directly — this
                # loop has to keep calling receive_json() while the cell runs,
                # otherwise an input_reply or interrupt sent mid-execution would
                # sit unread until the cell finished, defeating both features.
                # session.busy is set synchronously here (not left to _run_cell's
                # own first line) so a second "execute" arriving before the task
                # actually starts running still sees busy=True.
                session.busy = True
                asyncio.create_task(_run_cell(websocket, session, message["cell_id"], message["code"]))
            elif msg_type == "interrupt":
                await session.km.interrupt_kernel()
            elif msg_type == "input_reply":
                # Reply to whatever input()/getpass() call _stdin_relay() is
                # currently blocked on for this session (see there) — cell_id
                # isn't needed for routing since only one cell can run at a time.
                pending = session.pending_input
                if pending is not None and not pending.done():
                    pending.set_result(message.get("value", ""))
            elif msg_type == "attach_dataset":
                # Relayed from the browser, which fetched the actual bytes from B2
                # via a presigned URL backend/ minted — this service never talks to
                # B2 itself (PLANS/qbook-qml.md §0). Written into this kernel's own
                # workdir/datasets/ so a cell can do pd.read_csv("datasets/<name>").
                ok, error = write_dataset(session.workdir, message.get("filename", ""), message.get("content_b64", ""))
                if ok:
                    await websocket.send_json({"type": "dataset_attached", "filename": message["filename"]})
                else:
                    await websocket.send_json({"type": "error", "message": error})
    except WebSocketDisconnect:
        pass
    # Deliberately not shutting the kernel down on disconnect — a page refresh or
    # brief network blip shouldn't lose kernel state (variables in memory). The
    # idle-reap loop in kernel_manager.py cleans it up once it's genuinely unused.
