from .base import DeviceInfo, InsufficientCreditsError, IS_PRODUCTION, JobResult, QuantumProviderAdapter
from .qbraid_adapter import QbraidAdapter
from .ionq_adapter import IonqAdapter
from .ibm_adapter import IbmAdapter
from .iqm_adapter import IqmAdapter

# Add each new adapter (Qniverse) here as it's built — see PLANS/qroute.md §5
# for build order. Every adapter registers unconditionally, even without
# credentials, so GET /api/v1/qroute/providers can show the full five-provider
# roadmap with an honest "not configured" status rather than silently omitting
# unbuilt ones.
_ADAPTERS = [QbraidAdapter(), IonqAdapter(), IbmAdapter()]

# ...with one exception: IQM is a separate self-hosted service, not an API key.
# It only exists locally, so in production it would permanently read "not
# configured" — noise, not a roadmap. Dropping it from the registry hides it
# from /providers and /devices and makes a direct /jobs POST a clean 404.
if not IS_PRODUCTION:
    _ADAPTERS.append(IqmAdapter())

PROVIDER_REGISTRY: dict[str, QuantumProviderAdapter] = {a.provider_id: a for a in _ADAPTERS}


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
