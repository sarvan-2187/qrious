"""The one thing the rest of Qrious imports from `ai/`. Every feature calls
`ai_gateway.chat(...)` (or `.stream(...)`) — nothing outside this package
ever imports a provider class, a provider SDK, or branches on provider name.
"""
from __future__ import annotations

import time
import uuid
from typing import Any, AsyncIterator, Callable, Optional, Type

from pydantic import BaseModel

from ai import config
from ai.cache import CacheStore
from ai.exceptions import AIGatewayError, AIInvalidRequestError, AIProviderError
from ai.models import AIResponse, AITask, ChatMessage, CircuitState, GatewayHealth, ProviderHealth, StreamChunk, UsageRecord
from ai.rate_limit import InMemoryRateLimitStore, RateLimiter, RateLimitRule
from ai.registry import PROVIDER_CLASSES, build_providers
from ai.resilience.circuit_breaker import CircuitBreakerStore, InMemoryCircuitBreakerStore
from ai.resilience.retry import retry_with_backoff
from ai.router import resolve_chain
from ai.usage import record_usage


class AIGateway:
    def __init__(
        self,
        circuit_store: Optional[CircuitBreakerStore] = None,
        cache_store: Optional[CacheStore] = None,
        rate_limiter: Optional[RateLimiter] = None,
        db_provider: Optional[Callable[[], Any]] = None,
    ):
        self._provider_configs = config.load_provider_configs()
        self._providers = build_providers(self._provider_configs)
        self._circuit_store: CircuitBreakerStore = circuit_store or InMemoryCircuitBreakerStore(
            failure_threshold=config.AI_CIRCUIT_FAILURE_THRESHOLD,
            cooldown_seconds=config.AI_CIRCUIT_COOLDOWN_SECONDS,
        )
        self._cache_store = cache_store
        self._rate_limiter = rate_limiter or self._build_default_rate_limiter()
        self._db_provider = db_provider

    @staticmethod
    def _build_default_rate_limiter() -> Optional[RateLimiter]:
        if not config.AI_RATE_LIMIT_ENABLED:
            return None
        rules = [
            RateLimitRule("per_user_per_minute", config.AI_RATE_LIMIT_PER_USER_PER_MINUTE, 60),
            RateLimitRule("expensive_per_day", config.AI_RATE_LIMIT_EXPENSIVE_PER_DAY, 86400, expensive_only=True),
        ]
        return RateLimiter(InMemoryRateLimitStore(), rules, config.AI_RATE_LIMIT_EXPENSIVE_TASKS)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def chat(
        self,
        messages: list[ChatMessage],
        task: AITask,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
        response_model: Optional[Type[BaseModel]] = None,
        preferred_provider: Optional[str] = None,
        identity: Optional[str] = None,
        cache_key: Optional[str] = None,
        cache_ttl_seconds: int = 3600,
    ) -> AIResponse:
        if not config.AI_GATEWAY_ENABLED:
            raise AIGatewayError(task.value, ["gateway disabled (AI_GATEWAY_ENABLED=false)"])

        if identity is not None and self._rate_limiter is not None:
            await self._rate_limiter.check(identity, task.value)  # raises RateLimitExceeded — caller's problem, not a provider failure

        if cache_key and self._cache_store is not None:
            cached = await self._cache_store.get(cache_key)
            if cached is not None:
                cached.cached = True
                return cached

        request_id = str(uuid.uuid4())
        chain = resolve_chain(task, self._providers, preferred_provider)
        if not chain:
            raise AIGatewayError(task.value, ["no providers configured"])

        attempts: list[str] = []
        for index, (provider_name, model_override) in enumerate(chain):
            provider = self._providers[provider_name]

            if not await self._circuit_store.allow_request(provider_name):
                attempts.append(f"{provider_name}:circuit_open")
                continue

            attempt_started = time.monotonic()
            try:
                result, retries_used = await self._attempt_with_repair(
                    provider, messages, model_override, temperature, max_tokens, response_model,
                )
            except AIProviderError as exc:
                await self._circuit_store.record_failure(provider_name)
                attempts.append(f"{provider_name}:{type(exc).__name__}")
                elapsed_ms = (time.monotonic() - attempt_started) * 1000
                await self._log_usage(
                    request_id, task, provider_name, model_override or "?", "failure", 0, False,
                    type(exc).__name__, latency_ms=elapsed_ms,
                )
                continue

            await self._circuit_store.record_success(provider_name)
            result.fallback_used = index > 0
            result.retry_count = retries_used
            await self._log_usage(
                request_id, task, provider_name, result.model, "success", retries_used, result.fallback_used, None,
                result.input_tokens, result.output_tokens, result.total_tokens, latency_ms=result.latency_ms or 0.0,
            )

            if cache_key and self._cache_store is not None:
                await self._cache_store.set(cache_key, result, cache_ttl_seconds)

            return result

        raise AIGatewayError(task.value, attempts)

    async def stream(
        self,
        messages: list[ChatMessage],
        task: AITask,
        temperature: float = 0.4,
        max_tokens: Optional[int] = None,
        preferred_provider: Optional[str] = None,
        identity: Optional[str] = None,
    ) -> AsyncIterator[StreamChunk]:
        """Streaming does not attempt cross-provider failover mid-stream —
        once a provider has started emitting chunks to the caller, switching
        providers would mean discarding partial output the caller may have
        already forwarded downstream. Failover only applies to the FIRST
        provider attempted failing before it emits anything; per the task
        spec's §17 allowance ("preserve streaming for supported providers and
        document the limitation clearly")."""
        if not config.AI_GATEWAY_ENABLED:
            raise AIGatewayError(task.value, ["gateway disabled (AI_GATEWAY_ENABLED=false)"])
        if identity is not None and self._rate_limiter is not None:
            await self._rate_limiter.check(identity, task.value)

        chain = resolve_chain(task, self._providers, preferred_provider)
        if not chain:
            raise AIGatewayError(task.value, ["no providers configured"])

        attempts: list[str] = []
        for provider_name, model_override in chain:
            provider = self._providers[provider_name]
            if not await self._circuit_store.allow_request(provider_name):
                attempts.append(f"{provider_name}:circuit_open")
                continue
            try:
                started = False
                async for chunk in provider.stream(messages, model=model_override, temperature=temperature, max_tokens=max_tokens):
                    started = True
                    yield chunk
                await self._circuit_store.record_success(provider_name)
                return
            except AIProviderError as exc:
                await self._circuit_store.record_failure(provider_name)
                attempts.append(f"{provider_name}:{type(exc).__name__}")
                if started:
                    # Already emitted partial output to the caller — cannot
                    # silently retry another provider without the caller
                    # seeing a duplicated/garbled response. Surface the error.
                    raise
                continue

        raise AIGatewayError(task.value, attempts)

    async def health(self) -> GatewayHealth:
        providers: dict[str, ProviderHealth] = {}
        for name in PROVIDER_CLASSES:
            provider_config = self._provider_configs.get(name)
            configured = bool(provider_config and provider_config.enabled)
            circuit_state, failures = await self._circuit_store.get_state(name)
            available = False
            if configured:
                provider = self._providers.get(name)
                available = await provider.health_check() if provider else False
            providers[name] = ProviderHealth(
                configured=configured,
                available=available,
                circuit=circuit_state if configured else CircuitState.CLOSED,
                consecutive_failures=failures,
            )

        any_available = any(p.available for p in providers.values())
        any_configured = any(p.configured for p in providers.values())
        if not any_configured:
            gateway_status = "unavailable"
        elif any_available:
            gateway_status = "healthy"
        else:
            gateway_status = "degraded"

        return GatewayHealth(gateway=gateway_status, providers=providers)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    async def _attempt_with_repair(
        self,
        provider,
        messages: list[ChatMessage],
        model: Optional[str],
        temperature: float,
        max_tokens: Optional[int],
        response_model: Optional[Type[BaseModel]],
    ) -> tuple[AIResponse, int]:
        """Transient failures (429/timeout/5xx) retry via retry_with_backoff.
        A structured-output schema mismatch is a different failure mode — no
        backoff needed, just a corrective follow-up message — so it gets its
        own small outer loop, generalizing the one-retry-with-correction
        pattern already proven in qstudio_service/pipeline.py."""
        working_messages = list(messages)
        total_retries = 0
        repair_budget = config.AI_STRUCTURED_OUTPUT_REPAIR_RETRIES if response_model is not None else 0

        for repair_attempt in range(repair_budget + 1):
            async def _call() -> AIResponse:
                return await provider.chat(
                    working_messages, model=model, temperature=temperature,
                    max_tokens=max_tokens, response_model=response_model,
                )

            try:
                result, transient_retries = await retry_with_backoff(
                    _call, config.AI_MAX_PROVIDER_RETRIES, config.AI_RETRY_BASE_DELAY_SECONDS, config.AI_RETRY_MAX_DELAY_SECONDS,
                )
                return result, total_retries + transient_retries
            except AIInvalidRequestError as exc:
                # Covers both failure shapes: our own client-side pydantic validation
                # (openai_compatible.py's "did not validate against ...") AND a provider
                # rejecting the tool call itself server-side before we ever see JSON to
                # parse (e.g. Groq's "Tool call validation failed: ... did not match
                # schema" 400 — observed live: gpt-oss-120b occasionally nests fields
                # under a block-name key instead of the flat shape requested). Any
                # AIInvalidRequestError while a response_model was requested is worth
                # one corrective re-prompt before giving up on this provider — there's
                # no cheaper transient-failure explanation for a 400 in this path.
                is_schema_mismatch = response_model is not None
                if is_schema_mismatch and repair_attempt < repair_budget:
                    working_messages.append(ChatMessage(
                        role="user",
                        content=(
                            f"Your previous response did not match the required structure "
                            f"({response_model.__name__}). Reformat your answer to strictly "
                            f"conform to the requested schema and try again."
                        ),
                    ))
                    total_retries += 1
                    continue
                raise
        raise AssertionError("unreachable")  # loop always returns or raises

    async def _log_usage(
        self,
        request_id: str,
        task: AITask,
        provider: str,
        model: str,
        status: str,
        retry_count: int,
        fallback_used: bool,
        error_type: Optional[str],
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        latency_ms: float = 0.0,
    ) -> None:
        db = self._db_provider() if self._db_provider else None
        record = UsageRecord(
            request_id=request_id, task=task.value, provider=provider, model=model,
            status=status, latency_ms=latency_ms, retry_count=retry_count, fallback_used=fallback_used,
            input_tokens=input_tokens, output_tokens=output_tokens, total_tokens=total_tokens,
            error_type=error_type,
        )
        await record_usage(db, record)

    # ------------------------------------------------------------------
    # Wiring called once from main.py's lifespan, after connect_to_mongo() —
    # get_db() returns None until then, so this can't happen at import time
    # (when the module-level `ai_gateway` singleton below is constructed).
    # ------------------------------------------------------------------

    def configure(self, db_provider: Optional[Callable[[], Any]] = None) -> None:
        if db_provider is not None:
            self._db_provider = db_provider


ai_gateway = AIGateway()
