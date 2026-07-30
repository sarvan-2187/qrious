"""Normalized error hierarchy. Provider adapters MUST catch their SDK's own
exceptions and re-raise one of these — the gateway's retry/failover logic
(gateway.py) and circuit breaker only ever look at these types, never at a
vendor-specific exception class. This is what lets the router treat "Groq
rate-limited me" and "Gemini rate-limited me" identically.
"""


class AIProviderError(Exception):
    """Base class for every normalized provider failure."""

    def __init__(self, message: str, provider: str, retryable: bool = False):
        super().__init__(message)
        self.provider = provider
        self.retryable = retryable


class AIRateLimitError(AIProviderError):
    """429 — provider-side rate limit or quota exhaustion. Always retryable
    (against the next provider; retrying the same provider immediately is
    handled by the backoff policy in resilience/retry.py)."""

    def __init__(self, message: str, provider: str):
        super().__init__(message, provider, retryable=True)


class AIAuthenticationError(AIProviderError):
    """Bad/missing/expired credential. Never retryable — a second attempt
    against the same provider will fail identically, and no other provider
    can use this one's credential either."""

    def __init__(self, message: str, provider: str):
        super().__init__(message, provider, retryable=False)


class AITimeoutError(AIProviderError):
    """Request exceeded the configured connect/read timeout. Retryable."""

    def __init__(self, message: str, provider: str):
        super().__init__(message, provider, retryable=True)


class AIUnavailableError(AIProviderError):
    """5xx / connection failure / provider outage. Retryable."""

    def __init__(self, message: str, provider: str):
        super().__init__(message, provider, retryable=True)


class AIInvalidRequestError(AIProviderError):
    """4xx caused by the request itself (bad model id, malformed payload,
    content filtered, schema validation failed after the repair retry).
    Not retried against another provider by default — per the task spec,
    "don't retry errors caused by invalid application input unless another
    provider can legitimately handle that input." The one exception the
    gateway makes: an unknown/unsupported model id is provider-specific, so a
    different provider might still succeed — that case is still retried."""

    def __init__(self, message: str, provider: str, retryable: bool = False):
        super().__init__(message, provider, retryable=retryable)


class AICircuitOpenError(AIProviderError):
    """Raised internally by the circuit breaker to skip a provider without
    even attempting a network call. Always retryable (against the next
    provider in the chain) — the whole point of the circuit being open."""

    def __init__(self, provider: str):
        super().__init__(f"circuit open for provider '{provider}'", provider, retryable=True)


class AIGatewayError(Exception):
    """Every eligible provider in the chain failed. This is the only exception
    type that should ever reach a FastAPI route handler — see
    routers' exception handling, which maps this to the graceful-degradation
    response shape rather than leaking a provider stack trace."""

    def __init__(self, task: str, attempts: list[str]):
        self.task = task
        self.attempts = attempts
        super().__init__(f"all eligible providers failed for task '{task}': {attempts}")
