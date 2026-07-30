"""Per-provider circuit breaker: CLOSED -> OPEN -> HALF_OPEN -> CLOSED|OPEN.

State lives behind a `CircuitBreakerStore` interface specifically so the MVP
(InMemoryCircuitBreakerStore, below) can later be swapped for a Redis-backed
implementation without gateway.py or router.py changing at all — see
PLANS/ai-provider-resilience.md and docs/AI_GATEWAY.md's "Future Redis"
section. In-memory state does NOT survive a process restart and is NOT
shared across horizontally-scaled instances; that's the documented MVP
limitation, not an oversight.
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from ai.models import CircuitState


@dataclass
class _ProviderCircuit:
    state: CircuitState = CircuitState.CLOSED
    consecutive_failures: int = 0
    opened_at: float = 0.0
    half_open_probe_in_flight: bool = False


class CircuitBreakerStore(ABC):
    @abstractmethod
    async def allow_request(self, provider: str) -> bool:
        """False means: skip this provider without even attempting a call."""

    @abstractmethod
    async def record_success(self, provider: str) -> None:
        ...

    @abstractmethod
    async def record_failure(self, provider: str) -> None:
        ...

    @abstractmethod
    async def get_state(self, provider: str) -> tuple[CircuitState, int]:
        """Returns (state, consecutive_failures) — for the health endpoint."""


class InMemoryCircuitBreakerStore(CircuitBreakerStore):
    def __init__(self, failure_threshold: int, cooldown_seconds: float):
        self._failure_threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds
        self._circuits: dict[str, _ProviderCircuit] = {}

    def _get(self, provider: str) -> _ProviderCircuit:
        return self._circuits.setdefault(provider, _ProviderCircuit())

    async def allow_request(self, provider: str) -> bool:
        circuit = self._get(provider)
        if circuit.state == CircuitState.CLOSED:
            return True
        if circuit.state == CircuitState.OPEN:
            if time.monotonic() - circuit.opened_at >= self._cooldown_seconds:
                circuit.state = CircuitState.HALF_OPEN
                circuit.half_open_probe_in_flight = False
            else:
                return False
        if circuit.state == CircuitState.HALF_OPEN:
            # Only one trial request in flight at a time — otherwise a burst
            # of concurrent requests would all "test" a still-bad provider
            # simultaneously, defeating the point of the cooldown.
            if circuit.half_open_probe_in_flight:
                return False
            circuit.half_open_probe_in_flight = True
            return True
        return True

    async def record_success(self, provider: str) -> None:
        circuit = self._get(provider)
        circuit.state = CircuitState.CLOSED
        circuit.consecutive_failures = 0
        circuit.half_open_probe_in_flight = False

    async def record_failure(self, provider: str) -> None:
        circuit = self._get(provider)
        circuit.consecutive_failures += 1
        circuit.half_open_probe_in_flight = False
        if circuit.state == CircuitState.HALF_OPEN:
            circuit.state = CircuitState.OPEN
            circuit.opened_at = time.monotonic()
        elif circuit.consecutive_failures >= self._failure_threshold:
            circuit.state = CircuitState.OPEN
            circuit.opened_at = time.monotonic()

    async def get_state(self, provider: str) -> tuple[CircuitState, int]:
        circuit = self._get(provider)
        return circuit.state, circuit.consecutive_failures
