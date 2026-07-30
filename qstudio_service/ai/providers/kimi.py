from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class KimiProvider(OpenAICompatibleProvider):
    """Moonshot AI's Kimi platform at api.moonshot.ai/v1 — documented as
    request/response-compatible with the OpenAI Chat Completions API
    (platform.moonshot.ai/docs/guide/migrating-from-openai-to-kimi). Routed
    first for AITask.CODE/AITask.MANIM (see ai/config.py's
    TASK_PROVIDER_ORDER) — Moonshot's K-series models are specifically
    marketed for coding workloads. `KIMI_MODEL` is very likely to need
    updating over time; Moonshot ships new K-series model ids frequently."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="kimi",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
