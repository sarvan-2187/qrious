from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class ZaiProvider(OpenAICompatibleProvider):
    """Z.AI's GLM API. Z.AI documents more than one OpenAI-compatible base
    path (a general `/api/paas/v4` and a coding-plan-specific
    `/api/coding/paas/v4`) — this defaults to the general
    `https://api.z.ai/api/paas/v4` endpoint via ZAI_BASE_URL, override if
    your account is on the coding plan instead. Reads `Z_API_KEY` (matching
    this repo's existing env var naming), not `ZAI_API_KEY`."""

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="zai",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
