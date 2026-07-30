"""Exact-match response cache — opt-in per call via `chat(..., cache_key=...)`,
never automatic. The gateway has no reliable way to know on its own whether a
given call is "a generic explanation" (safe to cache) or "this user's private
conversation" (never cache) — that judgment stays with the caller, who picks
the cache key (or doesn't pass one at all, which disables caching for that
call). See docs/AI_GATEWAY.md for which existing call sites are good/bad
candidates.

Same Redis-ready shape as rate_limit.py/circuit_breaker.py: `CacheStore` is
the interface, `InMemoryCacheStore` is the MVP implementation, a Redis
implementation slots in later without gateway.py changing.
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Optional

from ai.models import AIResponse


class CacheStore(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[AIResponse]:
        ...

    @abstractmethod
    async def set(self, key: str, value: AIResponse, ttl_seconds: int) -> None:
        ...


class InMemoryCacheStore(CacheStore):
    def __init__(self):
        self._entries: dict[str, tuple[float, AIResponse]] = {}

    async def get(self, key: str) -> Optional[AIResponse]:
        entry = self._entries.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del self._entries[key]
            return None
        return value

    async def set(self, key: str, value: AIResponse, ttl_seconds: int) -> None:
        self._entries[key] = (time.monotonic() + ttl_seconds, value)
