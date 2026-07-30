import os

from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter

# qiskit's own JobStatus enum names (IonQJob.status() already maps IonQ's API
# status strings onto this enum internally) collapsed to the same 4-value set
# every other adapter uses — mirrors qbraid_service.py's _STATUS_MAP.
_STATUS_MAP = {
    "INITIALIZING": "queued",
    "QUEUED": "queued",
    "VALIDATING": "queued",
    "RUNNING": "running",
    "DONE": "completed",
    "CANCELLED": "failed",
    "ERROR": "failed",
}

# "ionq_qpu" (bare, no target) is a broken/deprecated identifier as of
# IonQ's current v0.4 API: qiskit-ionq's IonQProvider.get_backend("ionq_qpu")
# resolves fine for listing (it's a real Qiskit backend object), but when
# actually submitted, qiskit_to_ionq() strips the "ionq_" prefix and sends a
# bare "qpu" as the API's `target` field — IonQ's real API rejects that with
# "See https://docs.ionq.com for valid backends." (confirmed live). The real
# API only recognizes specific named QPUs (GET /v0.4/backends: qpu.harmony/
# aria-1/aria-2 are "retired", qpu.forte-1/forte-enterprise-1 are the current
# generation). qiskit-ionq's IonQProvider.get_backend() DOES support this —
# get_backend("qpu.forte-1") resolves via IonQBackend.with_name() to a
# backend named "ionq_qpu.forte-1", which correctly round-trips to the real
# "qpu.forte-1" target. Curated rather than iterating provider.backends()
# blindly, same judgement call qbraid_service.py makes for its own device
# list — and matching its precedent of listing a real device even when it's
# not practically usable right now (forte-1 reports "unavailable" with a
# multi-month queue on IonQ's live status, not "retired" — a real device,
# just not a quick one), rather than hiding it.
_CURATED_DEVICE_IDS = ["ionq_simulator", "qpu.forte-1"]


class IonqAdapter(QuantumProviderAdapter):
    provider_id = "ionq"
    display_name = "IonQ"

    def __init__(self):
        self._provider = None

    @property
    def provider(self):
        if self._provider is None:
            api_key = os.getenv("IONQ_API_KEY")
            if not api_key:
                raise ValueError("IONQ_API_KEY environment variable is not configured. Please set IONQ_API_KEY in backend/.env.")
            from qiskit_ionq import IonQProvider
            self._provider = IonQProvider(token=api_key)
        return self._provider

    def is_configured(self) -> bool:
        return bool(os.getenv("IONQ_API_KEY"))

    def list_devices(self) -> list[DeviceInfo]:
        devices = []
        for device_id in _CURATED_DEVICE_IDS:
            try:
                backend = self.provider.get_backend(device_id)
                devices.append({
                    "id": device_id,
                    "name": backend.name,
                    "provider": self.provider_id,
                    "modality": "trapped-ion",
                    "is_simulator": device_id == "ionq_simulator",
                    "status": "AVAILABLE" if backend.status() else "UNAVAILABLE",
                })
            except Exception as e:
                print(f"[ionq_adapter] skipping device {device_id}: {e}", flush=True)
        return devices

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        from qiskit import qasm2
        from qiskit_ionq.exceptions import IonQAPIError

        backend = self.provider.get_backend(device_id)
        circuit = qasm2.loads(qasm)
        try:
            job = backend.run(circuit, shots=shots)
        except IonQAPIError as e:
            # IonQAPIError.__str__ dumps the full response (headers, raw
            # body, error_type) — useful in a server log, not as a message
            # shown to a user. .args[0] is just the API's own "message"
            # field, extracted cleanly in from_response().
            message = e.args[0] if e.args else str(e)
            if e.status_code == 402 or "payment" in message.lower() or "insufficient" in message.lower():
                raise InsufficientCreditsError(
                    f"This IonQ account doesn't have funded credits for '{device_id}'. "
                    "Real quantum hardware requires a funded IonQ account — try the "
                    "simulator device, or add credits at cloud.ionq.com."
                ) from e
            raise RuntimeError(f"IonQ rejected this job: {message}") from e
        return job.job_id()

    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        backend = self.provider.get_backend(device_id)
        job = backend.retrieve_job(provider_job_id)
        status_obj = job.status()
        raw_status = getattr(status_obj, "name", str(status_obj)).upper()
        status = _STATUS_MAP.get(raw_status, "running")

        result: JobResult = {
            "status": status, "counts": None, "cost": None, "estimated_cost": None,
            "error_message": None, "status_detail": None,
        }

        if status == "completed":
            result["counts"] = job.get_counts()
        elif status == "failed":
            result["error_message"] = (
                "IonQ reported this job as failed. This most often happens when the "
                "account doesn't have funded credits for this specific device — try "
                "the simulator device instead."
            )

        return result
