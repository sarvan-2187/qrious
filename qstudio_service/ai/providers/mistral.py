from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class MistralProvider(OpenAICompatibleProvider):
    """Mistral publishes an official `mistralai` SDK, but its Chat Completions
    API (https://docs.mistral.ai/api) is also OpenAI-request-shape
    compatible — reused here via OpenAICompatibleProvider rather than adding
    a second SDK dependency solely for this one provider. Trade-off: loses
    the official SDK's Pydantic-native `.chat.parse()` convenience method;
    gains zero duplicated request/error-mapping code across providers. See
    docs/AI_GATEWAY.md's "Provider implementation" section for the full
    reasoning."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="mistral",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
