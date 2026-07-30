from .base import DeviceInfo, InsufficientCreditsError, JobResult, QuantumProviderAdapter
from .qbraid_adapter import QbraidAdapter
from .ionq_adapter import IonqAdapter
from .ibm_adapter import IbmAdapter
from .iqm_adapter import IqmAdapter

# Add each new adapter (Qniverse) here as it's built — see PLANS/qroute.md §5
# for build order. Every adapter registers unconditionally, even without
# credentials, so GET /api/v1/qroute/providers can show the full five-provider
# roadmap with an honest "not configured" status rather than silently omitting
# unbuilt ones.
PROVIDER_REGISTRY: dict[str, QuantumProviderAdapter] = {
    adapter.provider_id: adapter
    for adapter in [QbraidAdapter(), IonqAdapter(), IbmAdapter(), IqmAdapter()]
}


def get_adapter(provider_id: str) -> QuantumProviderAdapter:
    adapter = PROVIDER_REGISTRY.get(provider_id)
    if adapter is None:
        raise KeyError(f"Unknown provider '{provider_id}'. Known: {list(PROVIDER_REGISTRY)}")
    return adapter


__all__ = [
    "DeviceInfo",
    "InsufficientCreditsError",
    "JobResult",
    "QuantumProviderAdapter",
    "PROVIDER_REGISTRY",
    "get_adapter",
]
