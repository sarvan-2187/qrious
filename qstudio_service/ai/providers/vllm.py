from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class VLLMProvider(OpenAICompatibleProvider):
    """Future self-hosted inference (PLANS/ai-provider-resilience.md Tier 2)
    — vLLM's OpenAI-compatible server (https://docs.vllm.ai/...serving/openai_compatible_server)
    running as a REMOTE service (e.g. on RunPod), never inside this process.
    Only registered when VLLM_ENABLED=true AND VLLM_BASE_URL is set (see
    ai/config.py::load_provider_configs) — disabled, this class is never
    imported into a running provider chain. No GPU/vLLM package dependency
    is added to this application by this file; it is a plain HTTP client
    pointed at wherever vLLM is actually running."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="vllm",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
