"""Tests for the Multi-AI Gateway (ai/). No real provider calls — every test
uses FakeProvider in place of a real adapter. Async test bodies use
asyncio.run() rather than pytest-asyncio, matching this repo's existing
testing setup (requirements-dev.txt has no async pytest plugin installed;
see test_phase6_analytics.py's currently-skipped @pytest.mark.asyncio test
for what NOT to depend on here).
"""
import asyncio
from typing import AsyncIterator, Optional, Type

import pytest
from pydantic import BaseModel

from ai import config as ai_config
from ai.exceptions import (
    AIAuthenticationError,
    AIInvalidRequestError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from ai.gateway import AIGateway
from ai.models import AITask, ChatMessage
from ai.rate_limit import InMemoryRateLimitStore, RateLimitExceeded, RateLimiter, RateLimitRule
from ai.registry import build_providers
from ai.resilience.circuit_breaker import CircuitState, InMemoryCircuitBreakerStore


class FakeProvider:
    """Queue of results/exceptions consumed in order, one per `chat()` call.
    A queue entry that's an Exception instance is raised; anything else is
    returned as the `AIResponse`-shaped value directly."""

    def __init__(self, name: str, queue: list):
        self._name = name
        self._queue = list(queue)
        self.calls = 0

    @property
    def name(self) -> str:
        return self._name

    async def chat(self, messages, model=None, temperature=0.4, max_tokens=None, response_model=None):
        self.calls += 1
        if not self._queue:
            raise AssertionError(f"FakeProvider '{self._name}' called more times than scripted")
        item = self._queue.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    async def stream(self, messages, model=None, temperature=0.4, max_tokens=None) -> AsyncIterator:
        self.calls += 1
        if not self._queue:
            raise AssertionError(f"FakeProvider '{self._name}' called more times than scripted")
        item = self._queue.pop(0)
        if isinstance(item, Exception):
            raise item
        for chunk in item:
            yield chunk

    async def health_check(self) -> bool:
        return True


def _fast_gateway(providers: dict, monkeypatch, **kwargs) -> AIGateway:
    """No sleeping in tests — collapse retry/backoff to instant."""
    monkeypatch.setattr(ai_config, "AI_MAX_PROVIDER_RETRIES", 1)
    monkeypatch.setattr(ai_config, "AI_RETRY_BASE_DELAY_SECONDS", 0.0)
    monkeypatch.setattr(ai_config, "AI_RETRY_MAX_DELAY_SECONDS", 0.0)
    gateway = AIGateway(circuit_store=kwargs.get("circuit_store"), rate_limiter=kwargs.get("rate_limiter"))
    gateway._providers = providers
    return gateway


def _msg():
    return [ChatMessage(role="user", content="hi")]


class Resp:
    """Minimal stand-in matching the AIResponse fields the gateway reads off
    a successful provider.chat() return — avoids importing the real
    AIResponse just to fill it out identically in every test."""
    def __init__(self, content="ok", provider="groq", model="m", parsed=None):
        self.content = content
        self.provider = provider
        self.model = model
        self.latency_ms = 1.0
        self.input_tokens = None
        self.output_tokens = None
        self.total_tokens = None
        self.cached = False
        self.fallback_used = False
        self.retry_count = 0
        self.parsed = parsed


# --------------------------------------------------------------------------
# Successful primary provider
# --------------------------------------------------------------------------

def test_successful_primary_provider_no_fallback(monkeypatch):
    groq = FakeProvider("groq", [Resp(content="hello from groq")])
    gemini = FakeProvider("gemini", [Resp(content="should never be called")])
    gateway = _fast_gateway({"groq": groq, "gemini": gemini}, monkeypatch)

    result = asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))

    assert result.content == "hello from groq"
    assert result.fallback_used is False
    assert gemini.calls == 0


# --------------------------------------------------------------------------
# Rate limit fallback
# --------------------------------------------------------------------------

def test_rate_limit_fallback_to_next_provider(monkeypatch):
    # AI_MAX_PROVIDER_RETRIES=1 (set by _fast_gateway) means groq gets up to
    # 2 attempts (1 initial + 1 retry) before the gateway gives up on it and
    # moves to gemini — both must be queued as failures.
    groq = FakeProvider("groq", [AIRateLimitError("429", "groq"), AIRateLimitError("429", "groq")])
    gemini = FakeProvider("gemini", [Resp(content="hello from gemini", provider="gemini")])
    gateway = _fast_gateway({"groq": groq, "gemini": gemini}, monkeypatch)

    result = asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))

    assert result.content == "hello from gemini"
    assert result.fallback_used is True
    assert groq.calls == 2
    assert gemini.calls == 1


# --------------------------------------------------------------------------
# Timeout fallback
# --------------------------------------------------------------------------

def test_timeout_fallback_to_next_provider(monkeypatch):
    groq = FakeProvider("groq", [AITimeoutError("timeout", "groq"), AITimeoutError("timeout", "groq")])
    mistral = FakeProvider("mistral", [Resp(content="hello from mistral", provider="mistral")])
    gateway = _fast_gateway({"groq": groq, "mistral": mistral}, monkeypatch)

    result = asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))

    assert result.content == "hello from mistral"
    assert result.fallback_used is True


# --------------------------------------------------------------------------
# All providers fail
# --------------------------------------------------------------------------

def test_all_providers_fail_raises_normalized_gateway_error(monkeypatch):
    groq = FakeProvider("groq", [AIRateLimitError("429", "groq"), AIRateLimitError("429", "groq")])
    gemini = FakeProvider("gemini", [AIAuthenticationError("bad key", "gemini")])
    mistral = FakeProvider("mistral", [AITimeoutError("timeout", "mistral"), AITimeoutError("timeout", "mistral")])
    gateway = _fast_gateway({"groq": groq, "gemini": gemini, "mistral": mistral}, monkeypatch)

    from ai.exceptions import AIGatewayError
    with pytest.raises(AIGatewayError) as exc_info:
        asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))

    # Never a raw provider exception/message leaking through the gateway
    # boundary — just the normalized per-provider attempt summary.
    assert exc_info.value.task == AITask.CHAT.value
    assert len(exc_info.value.attempts) == 3


# --------------------------------------------------------------------------
# Circuit breaker
# --------------------------------------------------------------------------

def test_circuit_breaker_opens_and_skips_provider(monkeypatch):
    circuit_store = InMemoryCircuitBreakerStore(failure_threshold=2, cooldown_seconds=999)
    groq = FakeProvider("groq", [AIRateLimitError("429", "groq")] * 4)
    gemini = FakeProvider("gemini", [Resp(provider="gemini")] * 4)
    gateway = _fast_gateway({"groq": groq, "gemini": gemini}, monkeypatch, circuit_store=circuit_store)

    for _ in range(2):
        asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))

    state, failures = asyncio.run(circuit_store.get_state("groq"))
    assert state == CircuitState.OPEN
    assert failures >= 2

    calls_before = groq.calls
    asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT))
    # Circuit open — groq must not even be attempted again.
    assert groq.calls == calls_before


# --------------------------------------------------------------------------
# Missing API key
# --------------------------------------------------------------------------

def test_missing_api_key_excludes_provider_but_app_still_builds(monkeypatch):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "test-key-not-real")

    configs = ai_config.load_provider_configs()
    assert configs["mistral"].enabled is False
    assert configs["groq"].enabled is True

    providers = build_providers(configs)
    assert "mistral" not in providers
    assert "groq" in providers


# --------------------------------------------------------------------------
# Routing
# --------------------------------------------------------------------------

def test_code_task_routes_to_kimi_first():
    from ai.router import resolve_chain
    available = {"groq": object(), "gemini": object(), "kimi": object(), "mistral": object()}
    chain = resolve_chain(AITask.CODE, available)
    assert chain[0].provider == "kimi"


def test_flashcards_task_uses_cheap_groq_model_override():
    from ai.router import resolve_chain
    available = {"groq": object(), "gemini": object()}
    chain = resolve_chain(AITask.FLASHCARDS, available)
    groq_entry = next(entry for entry in chain if entry.provider == "groq")
    assert groq_entry.model == "openai/gpt-oss-20b"


def test_preferred_provider_moves_to_front_but_keeps_fallback():
    from ai.router import resolve_chain
    available = {"groq": object(), "gemini": object(), "mistral": object()}
    chain = resolve_chain(AITask.CHAT, available, preferred_provider="mistral")
    assert chain[0].provider == "mistral"
    assert len(chain) == 3


# --------------------------------------------------------------------------
# Sensitive logging
# --------------------------------------------------------------------------

def test_provider_build_never_logs_api_key(monkeypatch, capsys):
    secret = "sk-super-secret-value-should-never-appear-in-logs"
    monkeypatch.setenv("GROQ_API_KEY", secret)
    configs = ai_config.load_provider_configs()
    build_providers(configs)
    captured = capsys.readouterr()
    assert secret not in captured.out
    assert secret not in captured.err


# --------------------------------------------------------------------------
# Structured-output repair retry
# --------------------------------------------------------------------------

class _Schema(BaseModel):
    value: str


def test_structured_output_repair_retry_succeeds_on_second_attempt(monkeypatch):
    monkeypatch.setattr(ai_config, "AI_STRUCTURED_OUTPUT_REPAIR_RETRIES", 1)
    bad = AIInvalidRequestError("structured output did not validate against _Schema: bad json", "groq", retryable=False)
    good = Resp(parsed=_Schema(value="ok"))
    groq = FakeProvider("groq", [bad, good])
    gateway = _fast_gateway({"groq": groq}, monkeypatch)

    result = asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT, response_model=_Schema))

    assert result.parsed.value == "ok"
    assert groq.calls == 2


# --------------------------------------------------------------------------
# Application-level rate limiting
# --------------------------------------------------------------------------

def test_rate_limiter_blocks_after_limit(monkeypatch):
    limiter = RateLimiter(InMemoryRateLimitStore(), [RateLimitRule("per_user_per_minute", 2, 60)])
    groq = FakeProvider("groq", [Resp()] * 5)
    gateway = _fast_gateway({"groq": groq}, monkeypatch, rate_limiter=limiter)

    asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT, identity="user-1"))
    asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT, identity="user-1"))
    with pytest.raises(RateLimitExceeded):
        asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT, identity="user-1"))

    # A different identity has its own, unaffected budget.
    asyncio.run(gateway.chat(messages=_msg(), task=AITask.CHAT, identity="user-2"))
