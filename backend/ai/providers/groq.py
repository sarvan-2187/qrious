from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class GroqProvider(OpenAICompatibleProvider):
    """https://console.groq.com/docs/openai — Groq's own documented
    OpenAI-compatible endpoint. Already this codebase's primary provider
    (previously via langchain-groq); this adapter replaces that direct
    dependency so Groq becomes just one entry in the gateway's chain instead
    of the only option."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="groq",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
