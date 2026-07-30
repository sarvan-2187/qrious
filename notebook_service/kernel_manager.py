import asyncio
import base64
import os
import re
import resource
import shutil
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

from jupyter_client import AsyncKernelManager

# Root directory for per-session working directories — one subdirectory per
# (uid, notebook_id) kernel, holding whatever datasets have been attached to it
# (see main.py's "attach_dataset" WS message, PLANS/qbook-qml.md §1). Kept under
# the container's own tempdir since nothing here needs to survive a kernel restart
# any more than the kernel's in-memory variables do.
SESSION_ROOT = Path(tempfile.gettempdir()) / "qbook_sessions"


def _safe_dirname(key: str) -> str:
    """Session keys are "{uid}:{notebook_id}" — ":" is harmless on the Linux
    container this always runs in, but replaced anyway since a directory name
    derived from user-controlled-ish input (uid) shouldn't lean on that.
    """
    return re.sub(r"[^A-Za-z0-9_-]", "_", key)

# CPU time is a reliable rlimit — it measures actual consumed CPU-seconds, not
# reserved address space, so it doesn't share RLIMIT_AS's false-positive problem
# below.
CPU_LIMIT_SECONDS = int(os.getenv("QBOOK_KERNEL_CPU_SECONDS", "120"))

# Caps how many OS processes/threads the kernel's UID may hold in total. This is a
# per-UID kernel accounting value, not a strict per-kernel budget (every kernel here
# shares one UID — see Dockerfile's non-root USER), so it's a blunt fork-bomb
# backstop for the whole service, not per-session isolation. docker-compose.yml's
# `pids_limit` is the real, unbypassable version of this same defense (cgroups, not
# rlimits) — this is a second layer, not the primary one.
NPROC_LIMIT = int(os.getenv("QBOOK_KERNEL_NPROC_LIMIT", "256"))

MAX_KERNELS_PER_UID = int(os.getenv("QBOOK_MAX_KERNELS_PER_UID", "3"))

# Env vars NOT to hand to spawned kernels. Deliberately a denylist pattern, not an
# allowlist: kernels legitimately need most of the process's environment (PATH,
# HOME, LANG, etc. — Python, matplotlib, and Jupyter's own runtime-file discovery
# all depend on it) and hand-picking an allowlist risks silently breaking those in
# a way that's hard to notice (see the RLIMIT_AS incident above — this file's other
# bug was a guess that broke something without an obvious error until tested).
# Pattern-matching secrets by name is defense in depth for anything added to
# notebook_service/.env later, not just today's QBOOK_SERVICE_SECRET.
_SENSITIVE_ENV_NAME = re.compile(r"(SECRET|TOKEN|PASSWORD|CREDENTIAL|_KEY$|APIKEY)", re.IGNORECASE)


def _sanitized_kernel_env() -> dict:
    """Student code in a kernel can always do `import os; os.environ` — this is
    the actual boundary that keeps QBOOK_SERVICE_SECRET (used to sign/verify every
    session token) from being readable by the code it's meant to be gating access
    to. Verified live: before this existed, `os.environ['QBOOK_SERVICE_SECRET']`
    from inside a running kernel printed the real secret.
    """
    return {k: v for k, v in os.environ.items() if not _SENSITIVE_ENV_NAME.search(k)}


def _set_kernel_limits():
    """Runs inside the forked kernel process, before exec — passed as Popen's
    preexec_fn via AsyncKernelManager.start_kernel(). POSIX-only (fine: this only
    ever runs inside the Linux container), and deliberately not caught/guarded —
    if limits can't be applied, the kernel should fail to start rather than run
    unbounded.

    No RLIMIT_AS here (deliberately — see the module-level note below). Real memory
    containment is docker-compose.yml's `mem_limit` (a cgroup limit on actual
    resident memory), which doesn't have RLIMIT_AS's virtual-address-space problem.
    """
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_LIMIT_SECONDS, CPU_LIMIT_SECONDS))
    resource.setrlimit(resource.RLIMIT_NPROC, (NPROC_LIMIT, NPROC_LIMIT))


# --- Why there's no per-kernel RLIMIT_AS ---
# An earlier version of this file set RLIMIT_AS (virtual address space) to
# QBOOK_KERNEL_MEMORY_MB. Live-tested and reverted: `import qiskit` failed with
# "failed to map segment from shared object" at 512MB, because RLIMIT_AS caps
# *reserved* virtual address space, not actual physical memory used — loading
# qiskit's compiled Rust extension (and numpy/scipy underneath it) reserves far
# more virtual space than it ever resides in RAM. RLIMIT_AS is the wrong tool for
# bounding a process that loads large shared libraries; docker-compose.yml's
# `mem_limit` (cgroup, tracks real RSS) is the correct one and doesn't share this
# failure mode.


class CapacityError(Exception):
    pass


# Enforced here, not just client-side — the client-declared size_bytes backend/
# checks at upload time (PLANS/qbook-qml.md §6.2) is a UX guard, this is the real
# boundary, since this is the step that actually writes to the container's disk.
DATASET_MAX_BYTES = int(os.getenv("QBOOK_DATASET_MAX_BYTES", str(10 * 1024 * 1024)))
_SAFE_CSV_NAME = re.compile(r"^[\w.-]+\.csv$", re.IGNORECASE)


def write_dataset(workdir: Path, filename: str, content_b64: str) -> tuple[bool, str | None]:
    """Decodes a base64 CSV payload relayed over the kernel WebSocket and writes it
    into this session's own datasets/ directory. Returns (ok, error_message).
    """
    safe_name = os.path.basename(filename or "").strip()
    if not _SAFE_CSV_NAME.match(safe_name):
        return False, "Only a plain .csv filename (letters, numbers, ., _, -) is supported."

    try:
        raw = base64.b64decode(content_b64, validate=True)
    except Exception:
        return False, "Invalid file data."

    if len(raw) > DATASET_MAX_BYTES:
        return False, f"File exceeds the {DATASET_MAX_BYTES // (1024 * 1024)}MB limit."

    (workdir / "datasets" / safe_name).write_bytes(raw)
    return True, None


@dataclass
class KernelSession:
    key: str
    km: AsyncKernelManager
    kc: object
    workdir: Path
    last_active: float = field(default_factory=time.monotonic)
    busy: bool = False
    # Set by main.py's _stdin_relay() while a cell's input()/getpass() call is
    # blocked waiting on the kernel's stdin channel; resolved by ws_session()'s
    # main loop when the browser's "input_reply" WS message arrives. At most one
    # at a time — only one cell can run per session (see `busy` above), so a
    # single slot is enough, same reasoning as the frontend's pendingDatasetRef.
    pending_input: "asyncio.Future | None" = None

    def touch(self) -> None:
        self.last_active = time.monotonic()

    async def shutdown(self) -> None:
        try:
            self.kc.stop_channels()
        except Exception:
            pass
        try:
            await self.km.shutdown_kernel(now=True)
        except Exception:
            pass
        # Datasets attached to this kernel don't outlive it — consistent with the
        # kernel's in-memory variables already being gone at this point too.
        shutil.rmtree(self.workdir, ignore_errors=True)


class KernelSessionManager:
    """One kernel per (uid, notebook_id) session key, shared across a single
    notebook_service process — the "Kernel Gateway"-shaped execution model from
    PLANS/qbook.md §1. Not per-student containers; isolation here is OS resource
    limits + timeouts, not process/container boundaries.
    """

    def __init__(self, max_kernels: int, idle_timeout_seconds: int, max_kernels_per_uid: int = MAX_KERNELS_PER_UID):
        self.max_kernels = max_kernels
        self.idle_timeout_seconds = idle_timeout_seconds
        self.max_kernels_per_uid = max_kernels_per_uid
        self._sessions: dict[str, KernelSession] = {}
        self._lock = asyncio.Lock()

    def count(self) -> int:
        return len(self._sessions)

    def _uid_of(self, key: str) -> str:
        return key.split(":", 1)[0]

    async def get_or_create(self, key: str) -> KernelSession:
        async with self._lock:
            existing = self._sessions.get(key)
            if existing is not None:
                existing.touch()
                return existing

            if len(self._sessions) >= self.max_kernels:
                raise CapacityError()

            # Per-uid cap: without this, one user opening many notebooks and
            # running a cell in each can consume every slot in max_kernels,
            # denying the service to everyone else.
            uid = self._uid_of(key)
            uid_count = sum(1 for k in self._sessions if self._uid_of(k) == uid)
            if uid_count >= self.max_kernels_per_uid:
                raise CapacityError()

            workdir = SESSION_ROOT / _safe_dirname(key)
            (workdir / "datasets").mkdir(parents=True, exist_ok=True)

            km = AsyncKernelManager(kernel_name="python3")
            await km.start_kernel(preexec_fn=_set_kernel_limits, env=_sanitized_kernel_env(), cwd=str(workdir))
            kc = km.client()
            kc.start_channels()
            await kc.wait_for_ready(timeout=60)

            session = KernelSession(key=key, km=km, kc=kc, workdir=workdir)
            self._sessions[key] = session
            return session

    async def drop(self, key: str) -> None:
        async with self._lock:
            session = self._sessions.pop(key, None)
        if session is not None:
            await session.shutdown()

    async def reap_idle_loop(self) -> None:
        """Background task started from main.py's lifespan. Runs for the life of
        the process; cancellation on shutdown is expected and swallowed by the
        caller, not here.
        """
        while True:
            await asyncio.sleep(60)
            now = time.monotonic()
            stale = [
                key
                for key, session in self._sessions.items()
                if not session.busy and (now - session.last_active) > self.idle_timeout_seconds
            ]
            for key in stale:
                print(f"[qbook] reaping idle kernel session {key}", flush=True)
                await self.drop(key)

    async def shutdown_all(self) -> None:
        for key in list(self._sessions.keys()):
            await self.drop(key)