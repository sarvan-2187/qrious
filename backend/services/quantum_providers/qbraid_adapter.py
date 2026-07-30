from services.qbraid_service import qbraid_service

from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter

# qBraid is an aggregator — each curated device id maps to a DIFFERENT real
# chip's modality, not one modality for the whole provider. Mirrors the
# vendor breakdown already documented in qbraid_service.py's
# _CURATED_DEVICE_IDS comments.
_DEVICE_MODALITY = {
    "ionq:ionq:sim:simulator": "trapped-ion",
    "openquantum:ionq:qpu:forte-1": "trapped-ion",
    "rigetti:rigetti:qpu:cepheus-1-108q": "superconducting",
}


class QbraidAdapter(QuantumProviderAdapter):
    provider_id = "qbraid"
    display_name = "qBraid"

    def is_configured(self) -> bool:
        try:
            qbraid_service.provider
            return True
        except ValueError:
            return False

    def list_devices(self) -> list[DeviceInfo]:
        devices = qbraid_service.list_devices()
        return [
            {
                "id": d["id"],
                "name": d["name"],
                "provider": self.provider_id,
                "modality": _DEVICE_MODALITY.get(d["id"], "superconducting"),
                "is_simulator": d["is_simulator"],
                "status": d["status"],
            }
            for d in devices
        ]

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        try:
            return qbraid_service.submit_job(qasm, device_id, shots)
        except RuntimeError as e:
            # qbraid_service already raises a clear "no funded credits"
            # RuntimeError on a 402 — re-raise as the shared error type so
            # qroute_router.py only needs one except clause across all
            # providers instead of per-adapter special-casing.
            raise InsufficientCreditsError(str(e)) from e

    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        result = qbraid_service.get_job_result(provider_job_id)
        return {
            "status": result["status"],
            "counts": result["counts"],
            "cost": result["cost"],
            "estimated_cost": result["estimated_cost"],
            "error_message": result["error_message"],
            "status_detail": None,
        }
