from abc import ABC, abstractmethod
from typing import Literal, Optional, TypedDict

Modality = Literal["superconducting", "trapped-ion", "aggregator"]


class DeviceInfo(TypedDict):
    id: str                # provider-native device id, passed back verbatim in submit_job
    name: str
    provider: str           # "qbraid" | "ibm" | "ionq" | "iqm" | "qniverse"
    modality: Modality      # per-DEVICE, not per-provider — aggregators mix modalities
    is_simulator: bool
    status: str


class JobResult(TypedDict):
    status: Literal["queued", "running", "completed", "failed"]
    counts: Optional[dict]
    cost: Optional[float]
    estimated_cost: Optional[float]
    error_message: Optional[str]
    # Optional human-readable context for a non-terminal status — e.g. real
    # hardware queue depth ("42 jobs ahead on ibm_fez"). Real QPU queues can
    # legitimately sit at "queued" for a long time; without this the frontend
    # has no way to distinguish "genuinely still queued behind other users"
    # from "something's stuck." None for providers/states with nothing extra
    # to say (e.g. qBraid/IonQ's fast simulators, or any terminal status).
    status_detail: Optional[str]


class InsufficientCreditsError(RuntimeError):
    """Raised when a provider rejects a submission because the account has no
    funded credits/access for the requested device. Routers catch this once,
    centrally, and turn it into a 402 — see qroute_router.py."""


class QuantumProviderAdapter(ABC):
    provider_id: str
    display_name: str

    @abstractmethod
    def is_configured(self) -> bool:
        """Whether this provider's required env var(s) are present. Adapters
        without credentials still register (so /providers can list them as
        'not configured' rather than silently omitting them), they just
        can't serve devices/jobs until configured."""

    @abstractmethod
    def list_devices(self) -> list[DeviceInfo]:
        ...

    @abstractmethod
    def submit_job(self, qasm: str, device_id: str, shots: int) -> str:
        """Returns a provider-native job id/QRN, to be stored verbatim and
        passed back into get_job_result."""

    @abstractmethod
    def get_job_result(self, provider_job_id: str, device_id: str) -> JobResult:
        """`device_id` is the same value originally passed to submit_job.
        qBraid's load_job() doesn't need it (its QRN is globally resolvable),
        but IonQ/IBM/IQM's SDKs all reconstruct a job through its backend
        object, not from a bare job id — so the router always has it on hand
        (it's stored on the Mongo doc already) and passes it through rather
        than every adapter re-deriving or ignoring it inconsistently."""
