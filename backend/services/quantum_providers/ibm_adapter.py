import os

from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter

# qiskit-ibm-runtime's RuntimeJobV2.status() already returns one of these
# plain strings directly (no enum unwrap needed, unlike qBraid/IonQ) — see
# runtime_job_v2.py's own _reverse_mapping. Collapsed to the same 4-value set
# every other adapter uses.
_STATUS_MAP = {
    "INITIALIZING": "queued",
    "QUEUED": "queued",
    "RUNNING": "running",
    "DONE": "completed",
    "CANCELLED": "failed",
    "ERROR": "failed",
}


class IbmAdapter(QuantumProviderAdapter):
    provider_id = "ibm"
    display_name = "IBM Quantum Cloud"

    def __init__(self):
        self._service = None

    @property
    def service(self):
        if self._service is None:
            api_key = os.getenv("QIBM_API_KEY")
            instance = os.getenv("QIBM_INSTANCE_CRN")
            if not api_key or not instance:
                raise ValueError(
                    "QIBM_API_KEY and QIBM_INSTANCE_CRN environment variables are not both "
                    "configured. Please set both in backend/.env."
                )
            from qiskit_ibm_runtime import QiskitRuntimeService
            # channel="ibm_cloud" + explicit token/instance (not save_account())
            # deliberately: this is a shared server process handling many
            # users' requests, not a personal notebook writing to disk.
            self._service = QiskitRuntimeService(channel="ibm_cloud", token=api_key, instance=instance)
        return self._service

    def is_configured(self) -> bool:
        return bool(os.getenv("QIBM_API_KEY")) and bool(os.getenv("QIBM_INSTANCE_CRN"))

    def list_devices(self) -> list[DeviceInfo]:
        devices = []
        for backend in self.service.backends():
            try:
                operational = backend.status().operational
            except Exception:
                operational = False
            devices.append({
                "id": backend.name,
                "name": backend.name,
                "provider": self.provider_id,
                "modality": "superconducting",
                "is_simulator": False,
                "status": "AVAILABLE" if operational else "UNAVAILABLE",
            })
        return devices

    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        from qiskit import qasm2
        from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
        from qiskit_ibm_runtime import SamplerV2

        backend = self.service.backend(device_id)
        circuit = qasm2.loads(qasm)
        pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
        isa_circuit = pm.run(circuit)

        sampler = SamplerV2(mode=backend)
        try:
            job = sampler.run([isa_circuit], shots=shots)
        except Exception as e:
            if "402" in str(e) or "insufficient" in str(e).lower() or "quota" in str(e).lower():
                raise InsufficientCreditsError(
                    f"This IBM Cloud instance doesn't have available quota for '{device_id}'. "
                    "Real quantum hardware requires a funded/allotted IBM Cloud plan — check "
                    "your instance at quantum.cloud.ibm.com."
                ) from e
            raise
        return job.job_id()

    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        job = self.service.job(provider_job_id)
        raw_status = job.status()
        status = _STATUS_MAP.get(raw_status, "running")

        result: JobResult = {
            "status": status, "counts": None, "cost": None, "estimated_cost": None,
            "error_message": None, "status_detail": None,
        }

        if status == "queued":
            # Real hardware queues are shared across every IBM Cloud user
            # globally — "queued" can legitimately last a long time. Surface
            # the actual pending-job count so this reads as "queued behind
            # 42 others," not "stuck."
            try:
                pending = job.backend().status().pending_jobs
                result["status_detail"] = f"{pending} job(s) ahead of yours on {device_id}"
            except Exception:
                pass

        if status == "completed":
            pub_result = job.result()[0]
            # DataBin exposes one field per classical register on the
            # transpiled circuit — grab the first rather than hardcoding a
            # register name like "meas", since that name depends on how the
            # source QASM declared its creg.
            _creg_name, bit_array = next(iter(pub_result.data.items()))
            result["counts"] = bit_array.get_counts()
        elif status == "failed":
            result["error_message"] = job.error_message() or (
                "IBM reported this job as failed with no further detail. This most "
                "often happens when the IBM Cloud instance has no available quota "
                "for this specific device."
            )

        return result
