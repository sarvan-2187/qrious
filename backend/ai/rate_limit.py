"""Application-level rate limiting — separate concern from provider-level
failover. Failing over to Gemini when Groq 429s does NOT mean a user gets
unlimited inference; this is the "clean interface for future user-level
limits" the task spec asks for (§20).

`RateLimitStore` is the interface future Redis-backed distributed limiting
implements (see PLANS/ai-provider-resilience.md's Tier 1/2 and
docs/AI_GATEWAY.md's Redis section) — `InMemoryRateLimitStore` below is a
fixed-window counter per key, correct for a single instance only. It is
explicitly NOT sufficient for a horizontally-scaled deployment (each
instance would enforce its own separate limit) — documented here and in
docs/AI_GATEWAY.md, not silently assumed to scale.

Disabled by default (`AI_RATE_LIMIT_ENABLED=false`) per the task spec's
"do not introduce arbitrary restrictive quotas unless configurable" — this
module is fully wired into the gateway (see gateway.py) but inert unless
turned on.
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


class RateLimitExceeded(Exception):
    """Application-level throttling — distinct from ai.exceptions'
    provider-failure hierarchy. Never triggers provider failover; it means
    "this caller, not this provider, is the problem.\""""

    def __init__(self, rule_name: str, limit: int, window_seconds: int):
        self.rule_name = rule_name
        super().__init__(f"rate limit '{rule_name}' exceeded: {limit} requests / {window_seconds}s")


class RateLimitStore(ABC):
    @abstractmethod
    async def check_and_increment(self, key: str, limit: int, window_seconds: int) -> bool:
        """Returns True if this request is allowed (and counts it), False if
        the caller is already at/over the limit for this window."""


class InMemoryRateLimitStore(RateLimitStore):
    def __init__(self):
        self._windows: dict[str, tuple[float, int]] = {}

    async def check_and_increment(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        window_start, count = self._windows.get(key, (now, 0))
        if now - window_start >= window_seconds:
            window_start, count = now, 0
        if count >= limit:
            self._windows[key] = (window_start, count)
            return False
        self._windows[key] = (window_start, count + 1)
        return True


@dataclass(frozen=True)
class RateLimitRule:
    name: str
    limit: int
    window_seconds: int
    expensive_only: bool = False


class RateLimiter:
    """Evaluates a fixed set of named rules against one request. `identity`
    is caller-supplied (a Firebase uid today; nothing stops a future IP-based
    rule using the request's client host instead) — the gateway does not
    know or care what an "identity" represents, only that it's a stable key
    to count against. Rules marked `expensive_only` (e.g. "50 reasoning/code/
    video-script calls per day") are skipped for tasks not in the caller-
    supplied `expensive_tasks` set — see ai/config.py's AI_RATE_LIMIT_EXPENSIVE_TASKS."""

    def __init__(self, store: RateLimitStore, rules: list[RateLimitRule], expensive_tasks: frozenset[str] = frozenset()):
        self._store = store
        self._rules = rules
        self._expensive_tasks = expensive_tasks

    async def check(self, identity: str, task: Optional[str] = None) -> None:
        is_expensive = task is not None and task in self._expensive_tasks
        for rule in self._rules:
            if rule.expensive_only and not is_expensive:
                continue
            key = f"{rule.name}:{identity}"
            allowed = await self._store.check_and_increment(key, rule.limit, rule.window_seconds)
            if not allowed:
                raise RateLimitExceeded(rule.name, rule.limit, rule.window_seconds)
