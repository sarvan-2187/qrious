from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class NvidiaProvider(OpenAICompatibleProvider):
    """NVIDIA NIM's hosted inference API at integrate.api.nvidia.com/v1 — an
    OpenAI-compatible surface in front of 100+ hosted open-weight models
    (confirmed via docs.api.nvidia.com). `NVIDIA_MODEL` should be set to
    whichever model id you actually have access to on your NVIDIA account —
    the default here is a common NIM catalog id, not guaranteed available on
    every key."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="nvidia",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
