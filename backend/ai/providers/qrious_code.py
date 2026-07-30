from ai.config import ProviderConfig
from ai.providers.openai_compatible import OpenAICompatibleProvider


class QriousCodeProvider(OpenAICompatibleProvider):
    """Qrious's own fine-tuned quantum-code model — `llm_service/qrious-code-1.0`,
    a Qwen3 checkpoint paired with a Qdrant index over the Qiskit API docs
    (`llm_service/rag/`).

    Served the same way VLLMProvider is: as a REMOTE OpenAI-compatible HTTP
    endpoint, never loaded inside this process. Nothing in this file adds a
    torch/transformers/GPU dependency to the API — it is a plain HTTP client
    pointed at wherever the model is actually being served.

    Registered LAST in registry.py's PROVIDER_CLASSES and deliberately absent
    from config.py's DEFAULT_PROVIDER_PRIORITY, so the gateway lists it but
    never routes to it. Two independent gates keep it inert:

      1. no `QRIOUS_CODE_ENABLED=true` + `QRIOUS_CODE_BASE_URL` -> registry.py
         logs it as disabled and never constructs it;
      2. even fully configured, `AIGateway` only ever walks the priority
         chain, which does not contain "qrious_code".

    To actually put it in service, serve the checkpoint behind an
    OpenAI-compatible server, set the two env vars, and add "qrious_code" to
    AI_PROVIDER_PRIORITY. Until then it is wired but idle, and the startup log
    says so.
    """

    def __init__(self, config: ProviderConfig, request_timeout: float, connect_timeout: float):
        super().__init__(
            name="qrious_code",
            api_key=config.api_key,
            base_url=config.base_url,
            default_model=config.default_model,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )
