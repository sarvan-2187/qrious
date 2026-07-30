import os
from dotenv import load_dotenv

from app_env import IS_PRODUCTION

load_dotenv()

# qBraid's own job-status strings collapse to this small closed set so the
# frontend only ever has to handle 4 values, not qBraid's internal enum.
_STATUS_MAP = {
    "INITIALIZING": "queued",
    "QUEUED": "queued",
    "VALIDATING": "queued",
    "RUNNING": "running",
    "COMPLETED": "completed",
    "CANCELLED": "failed",
    "FAILED": "failed",
}

# Curated subset of qBraid's full device catalog — a fast/free simulator
# first, then real QPUs, not the full 27-device account catalog. Kept as a
# plain list (not a live catalog call) so the "is this safe to show a
# student" judgement is explicit and reviewable, rather than silently
# picking up whatever qBraid adds later. Verified end-to-end with a real
# Bell-pair circuit against the real account:
#   - ionq:ionq:sim:simulator: works correctly (confirmed {'00': 50, '11': 50}
#     for shots=100), listed first as the default/free option.
#   - qbraid:qbraid:sim:qir-sv deliberately excluded: submitted successfully
#     but every job immediately came back JobStatus.FAILED with 0 execution
#     duration — this "qir-sv" device appears to expect actual QIR bitcode
#     input rather than an OpenQASM/QASM3 string, so it's not usable via the
#     plain device.run([qasm_string], ...) path this service uses. Revisit
#     if qBraid changes what this device accepts.
#   - Real QPUs (openquantum:ionq:qpu:forte-1, rigetti:rigetti:qpu:cepheus-1-108q):
#     valid device IDs, but THIS account currently has no funded real-hardware
#     credits — rigetti's device.run(...) raises a 402 Payment Required
#     directly, and forte-1's job gets accepted but comes back FAILED with 0
#     execution duration and empty metadata (same root cause, surfaced
#     differently by each vendor). Left in the list since they're valid
#     devices for any account that does have hardware credits — see
#     submit_job/get_job_result below for how the 402 case is now surfaced
#     to the user instead of a bare unexplained failure.
_CURATED_DEVICE_IDS = [
    "ionq:ionq:sim:simulator",                # IonQ simulator (free, verified working)
    "openquantum:ionq:qpu:forte-1",           # real IonQ QPU (needs funded credits)
    "rigetti:rigetti:qpu:cepheus-1-108q",     # real Rigetti QPU (needs funded credits)
]


class QbraidService:
    def __init__(self):
        self._provider = None

    @property
    def provider(self):
        if self._provider is None:
            api_key = os.getenv("QBRAID_API_KEY")
            if not api_key:
                raise ValueError("QBRAID_API_KEY environment variable is not configured. Please set QBRAID_API_KEY in backend/.env.")
            from qbraid import QbraidProvider
            self._provider = QbraidProvider(api_key=api_key)
        return self._provider

    def list_devices(self):
        devices = []
        # The deployed account has no funded real-hardware credits (see the
        # _CURATED_DEVICE_IDS notes above): every QPU submission there ends in a
        # 402 or an instant unexplained FAILED. Production lists only the
        # simulators so users aren't offered a device that cannot work; local
        # dev still sees the full catalog for testing against real credentials.
        device_ids = [d for d in _CURATED_DEVICE_IDS if "sim:" in d] if IS_PRODUCTION else _CURATED_DEVICE_IDS
        for device_id in device_ids:
            try:
                device = self.provider.get_device(device_id)
                status_val = getattr(device, "status", "UNKNOWN")
                if callable(status_val):
                    status_val = status_val()
                devices.append({
                    "id": device_id,
                    "name": getattr(device, "name", device_id),
                    "is_simulator": "sim:" in device_id,
                    # DeviceStatus is an Enum whose default str() is
                    # "DeviceStatus.ONLINE", not "ONLINE" — .name gives the
                    # bare member name, same fix already applied to job
                    # status in get_job_result() below.
                    "status": getattr(status_val, "name", str(status_val)),
                })
            except Exception as e:
                # A single unavailable/renamed device shouldn't take down the
                # whole device list for everyone else.
                print(f"[qbraid_service] skipping device {device_id}: {e}", flush=True)
        return devices

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        device = self.provider.get_device(device_id)
        try:
            job = device.run([qasm], shots=shots)[0]
        except Exception as e:
            # qBraid's own runtime API rejects submission outright with a 402
            # when the account has no funded credits for a given device (real
            # QPUs, mainly) — surface that plainly instead of the raw
            # "Runtime API error: 402" wrapper exception text.
            if "402" in str(e):
                raise RuntimeError(
                    f"This qBraid account doesn't have funded credits for '{device_id}'. "
                    "Real quantum hardware requires a funded qBraid account — try a "
                    "simulator device, or add credits at account.qbraid.com."
                ) from e
            raise
        return job.id

    def get_job_result(self, job_qrn: str) -> dict:
        # load_job resolves its own qBraid auth from QBRAID_API_KEY in the
        # environment (this module's load_dotenv() call already populated
        # it), so it doesn't need our cached `self.provider` instance — but
        # accessing the property first still gets us the clearer
        # "QBRAID_API_KEY not configured" error if it's missing, instead of
        # whatever less-obvious error the SDK would raise on its own.
        self.provider
        from qbraid.runtime import load_job
        job = load_job(job_qrn, provider="qbraid")
        status_obj = job.status()
        # JobStatus is an Enum whose default str() is "JobStatus.FAILED", not
        # "FAILED" — .name gives the bare member name _STATUS_MAP expects.
        # Falls back to str() for any status type that isn't a real Enum.
        raw_status = getattr(status_obj, "name", str(status_obj)).upper()
        status = _STATUS_MAP.get(raw_status, "running")

        result = {"status": status, "counts": None, "cost": None, "estimated_cost": None, "error_message": None}

        metadata = getattr(job, "metadata", None)
        if callable(metadata):
            metadata = metadata()
        if isinstance(metadata, dict):
            result["cost"] = metadata.get("cost")
            result["estimated_cost"] = metadata.get("estimatedCost")

        if status == "completed":
            job_result = job.result()
            result["counts"] = job_result.data.get_counts()
        elif status == "failed":
            # qBraid doesn't reliably expose a failure reason through the SDK
            # (metadata() came back empty for a real-QPU job that failed
            # instantly with 0 execution duration during testing) — best
            # effort extraction, falling back to the most common real cause
            # observed in practice: the account lacking funded credits for
            # that specific device (simulators are typically free/included;
            # real QPUs are not).
            reason = None
            if isinstance(metadata, dict):
                reason = metadata.get("statusMsg") or metadata.get("errorMessage")
            result["error_message"] = reason or (
                "qBraid reported this job as failed with no further detail. "
                "This most often happens when the account doesn't have funded "
                "credits for this specific device — try a simulator device instead."
            )

        return result


qbraid_service = QbraidService()
