"""Deterministic priority/fallback routing — no dynamic scoring for MVP (task
spec §27: "Do NOT over-engineer dynamic scoring for MVP. Implement
deterministic priority/fallback routing now while keeping the router
extensible."). Provider *order* is decided here; whether a provider in that
order actually gets tried (circuit state) is gateway.py's job at call time —
this module doesn't touch the circuit breaker at all, keeping "what order"
and "is it currently eligible" separate concerns.
"""
from __future__ import annotations

from typing import Optional

from ai.config import DEFAULT_PROVIDER_PRIORITY, TASK_MODEL_OVERRIDE, TASK_PROVIDER_ORDER
from ai.models import AITask, RouteTarget
from ai.providers.base import LLMProvider


def resolve_chain(
    task: AITask,
    available_providers: dict[str, LLMProvider],
    preferred_provider: Optional[str] = None,
) -> list[RouteTarget]:
    """Builds the ordered list of (provider, model) to attempt for this task,
    filtered to providers that are actually configured. `preferred_provider`
    is a hint, not an exclusive choice — per the task spec's own example
    (`preferred_provider="gemini"`), it moves to the front of the chain; the
    rest of the chain still exists as fallback if it fails."""
    order = TASK_PROVIDER_ORDER.get(task, DEFAULT_PROVIDER_PRIORITY)
    order = [name for name in order if name in available_providers]

    if preferred_provider and preferred_provider in available_providers:
        order = [preferred_provider] + [name for name in order if name != preferred_provider]

    return [RouteTarget(provider=name, model=TASK_MODEL_OVERRIDE.get((task, name))) for name in order]
