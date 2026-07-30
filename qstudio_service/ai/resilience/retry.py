"""Bounded exponential backoff with jitter for a single provider attempt.

This only ever retries the SAME provider (per the task spec's "attempt 1 ->
delay -> attempt 2 -> ... -> provider considered failed -> fallback
provider" flow) — moving to the next provider in the chain is gateway.py's
job, not this module's. Never infinite: `max_retries` is a hard bound.
"""
from __future__ import annotations

import asyncio
import random
from typing import Awaitable, Callable, TypeVar

from ai.exceptions import AIProviderError

T = TypeVar("T")


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    max_retries: int,
    base_delay: float,
    max_delay: float,
) -> tuple[T, int]:
    """Calls `fn()` up to `1 + max_retries` times. Re-raises immediately
    (no retry) on a non-retryable AIProviderError or any other exception
    type — only `AIProviderError` subclasses with `.retryable = True` are
    retried against the same provider. Returns `(result, retries_used)` so
    the caller can surface the count on AIResponse.retry_count."""
    attempt = 0
    while True:
        try:
            result = await fn()
            return result, attempt
        except AIProviderError as exc:
            if not exc.retryable or attempt >= max_retries:
                raise
            delay = min(base_delay * (2 ** attempt), max_delay)
            delay += random.uniform(0, base_delay * 0.5)
            await asyncio.sleep(delay)
            attempt += 1
