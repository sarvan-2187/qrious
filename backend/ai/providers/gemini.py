from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class GeminiProvider(OpenAICompatibleProvider):
    """Google's documented OpenAI-compatibility layer
    (https://ai.google.dev/gemini-api/docs/openai) at
    generativelanguage.googleapis.com/v1beta/openai — NOT the native Gemini
    endpoint (which uses a different request shape entirely). Chosen instead
    of the google-genai SDK specifically so Gemini can share
    OpenAICompatibleProvider's request/error-mapping logic with every other
    provider rather than needing its own bespoke adapter."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="gemini",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
