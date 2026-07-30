import os

import httpx  # already resolved in this venv — video_overview_router.py already imports and
              # uses it for this exact "call an internal service with a shared secret" pattern.

from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter


class IqmAdapter(QuantumProviderAdapter):
    provider_id = "iqm"
    display_name = "IQM Resonance"

    def is_configured(self) -> bool:
        return bool(os.getenv("IQM_SERVICE_URL")) and bool(os.getenv("IQM_SERVICE_SECRET"))

    def _headers(self):
        return {"X-Internal-Secret": os.getenv("IQM_SERVICE_SECRET")}

    def list_devices(self) -> list[DeviceInfo]:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.get(f"{url}/devices", headers=self._headers(), timeout=15)
        resp.raise_for_status()
        return [{**d, "provider": self.provider_id} for d in resp.json()]

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.post(
            f"{url}/jobs",
            json={"qasm": qasm, "device_id": device_id, "shots": shots},
            headers=self._headers(),
            timeout=30,
        )
        # iqm_service returns 402 the same way qbraid_service/ionq_adapter/ibm_adapter
        # already surface "no funded credits" — one shared convention across every
        # adapter, in-process or over HTTP.
        if resp.status_code == 402:
            raise InsufficientCreditsError(resp.json().get("detail", "Insufficient IQM credits."))
        resp.raise_for_status()
        return resp.json()["provider_job_id"]

    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        url = os.getenv("IQM_SERVICE_URL")
        resp = httpx.get(
            f"{url}/jobs/{provider_job_id}",
            params={"device_id": device_id},
            headers=self._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
