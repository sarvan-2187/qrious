"""Thin wrapper around iqm-client[qiskit]: qasm -> IQM backend -> submit -> poll -> counts.

The ONE place in the whole system that imports iqm.qiskit_iqm / touches IQM's SDK
qiskit line (see ../PLANS/iqm-service.md). Note: the plan originally called for the
lighter `qiskit-iqm` package, but that package now raises RuntimeError at import
time for any Resonance use ("please use iqm-client[qiskit] instead") — confirmed
by actually installing it (v18.2, the latest release). iqm-client[qiskit] is IQM's
own migration target and the only package that still works against Resonance.
"""
import os

# Fixed Resonance server URL — unlike the old qiskit-iqm API (one URL per device,
# e.g. cocos.resonance.meetiqm.com/garnet), the current IQMProvider takes ONE
# server URL plus a separate `quantum_computer` id — confirmed against the
# installed package's real IQMProvider.__init__ signature.
_RESONANCE_URL = "https://resonance.iqm.tech/"

# Curated, not discovered — Resonance has no "list backends" API the way
# IonQ/IBM do; each device is its own `quantum_computer` id passed to
# IQMProvider. All 6 confirmed live against the real account (docker exec
# probe during the build of this service, see PLANS/iqm-service.md §5 — this
# plan's one remaining open item is now resolved): 3 real QPUs (garnet/20q,
# emerald/54q, sirius/16q) plus their `:mock` counterparts, which IQM runs as
# free/no-queue-time testing endpoints — the same simulator-vs-hardware split
# qbraid_adapter.py/ionq_adapter.py already curate for their own providers.
_CURATED_DEVICES = {
    "garnet": {"name": "IQM Garnet", "is_simulator": False},
    "emerald": {"name": "IQM Emerald", "is_simulator": False},
    "sirius": {"name": "IQM Sirius", "is_simulator": False},
    "garnet:mock": {"name": "IQM Garnet (mock)", "is_simulator": True},
    "emerald:mock": {"name": "IQM Emerald (mock)", "is_simulator": True},
    "sirius:mock": {"name": "IQM Sirius (mock)", "is_simulator": True},
}

# qiskit.providers.JobStatus names -> the same 4-value set every other QRoute
# adapter uses (_STATUS_MAP convention in ionq_adapter.py/ibm_adapter.py).
_STATUS_MAP = {
    "QUEUED": "queued",
    "INITIALIZING": "queued",
    "VALIDATING": "queued",
    "RUNNING": "running",
    "DONE": "completed",
    "CANCELLED": "failed",
    "ERROR": "failed",
}


class InsufficientCreditsError(RuntimeError):
    """Raised when Resonance rejects a submission for lack of funded credits/access."""


def _backend_for(device_id: str):
    from iqm.qiskit_iqm import IQMProvider

    if not os.getenv("IQM_TOKEN"):
        raise ValueError("IQM_TOKEN environment variable is not configured. Please set IQM_TOKEN in iqm_service/.env.")
    # Deliberately NOT passing token= here: IQMClient auto-reads the IQM_TOKEN
    # env var itself, and raises "Parameter sources must not be mixed" if it's
    # ALSO passed as an explicit kwarg while the env var is set — confirmed
    # live. iqm_service/.env is the only place IQM_TOKEN is set, so relying on
    # the env var is exactly the credential boundary this service is for.
    return IQMProvider(_RESONANCE_URL, quantum_computer=device_id).get_backend()


def list_devices() -> list[dict]:
    devices = []
    for device_id, meta in _CURATED_DEVICES.items():
        try:
            backend = _backend_for(device_id)
            devices.append({
                "id": device_id,
                "name": meta["name"],
                "modality": "superconducting",
                "is_simulator": meta["is_simulator"],
                # Successfully constructing the backend already round-trips to
                # Resonance for the current calibration set/architecture — if
                # that succeeded, the device is reachable and configured for
                # this account.
                "status": "AVAILABLE",
            })
        except Exception as e:
            print(f"[iqm_client] skipping device {device_id}: {e}", flush=True)
    return devices


def submit_job(qasm: str, device_id: str, shots: int) -> str:
    from qiskit import qasm2, transpile

    backend = _backend_for(device_id)
    circuit = qasm2.loads(qasm)
    transpiled = transpile(circuit, backend=backend)

    try:
        job = backend.run(transpiled, shots=shots)
    except Exception as e:
        message = str(e)
        if "402" in message or "insufficient" in message.lower() or "quota" in message.lower() or "credit" in message.lower():
            raise InsufficientCreditsError(
                f"This IQM Resonance account doesn't have funded credits/access for '{device_id}'. "
                "Check your account at resonance.meetiqm.com."
            ) from e
        raise RuntimeError(f"IQM Resonance rejected this job: {message}") from e

    return job.job_id()


def get_job_result(provider_job_id: str, device_id: str) -> dict:
    backend = _backend_for(device_id)
    job = backend.retrieve_job(provider_job_id)
    raw_status = job.status().name
    status = _STATUS_MAP.get(raw_status, "running")

    result = {
        "status": status, "counts": None, "cost": None, "estimated_cost": None,
        "error_message": None, "status_detail": None,
    }

    if status == "completed":
        result["counts"] = job.result().get_counts()
    elif status == "failed":
        result["error_message"] = job.error_message() or (
            "IQM Resonance reported this job as failed. This most often happens when the "
            "account doesn't have funded credits/access for this specific device."
        )

    return result
