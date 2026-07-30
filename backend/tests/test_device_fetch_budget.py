# backend/tests/test_device_fetch_budget.py
import asyncio
import time
from unittest.mock import patch

from routers import qroute_router


class FakeAdapter:
    """Stands in for a provider SDK — `delay` is the blocking network+import
    cost the real adapters pay inside asyncio.to_thread."""

    def __init__(self, provider_id, delay=0.0):
        self.provider_id = provider_id
        self.display_name = provider_id
        self.delay = delay
        self.calls = 0

    def is_configured(self):
        return True

    def list_devices(self):
        self.calls += 1
        time.sleep(self.delay)
        return [{"id": f"{self.provider_id}-dev", "provider": self.provider_id}]


def _run(coro):
    return asyncio.run(coro)


async def _scenario():
    fast = FakeAdapter("fast")
    slow = FakeAdapter("slow", delay=3.0)
    registry = {"fast": fast, "slow": slow}

    with patch.object(qroute_router, "PROVIDER_REGISTRY", registry), \
         patch.object(qroute_router, "_DEVICE_FETCH_BUDGET_SECONDS", 0.5):
        qroute_router._device_cache.clear()
        qroute_router._refresh_tasks.clear()

        started = time.monotonic()
        first = await qroute_router.list_devices(current_user=None)
        elapsed = time.monotonic() - started

        # The whole point: a provider slower than the budget must not hold the
        # response past it (production returned a CORS-less 524 instead).
        assert elapsed < 2.0, f"request blocked for {elapsed:.1f}s despite the budget"
        assert [d["provider"] for d in first] == ["fast"]

        # ...and the straggler was not cancelled, so it lands in the cache and
        # the next request serves it without paying the cold cost again.
        await asyncio.gather(*qroute_router._refresh_tasks.values())
        second = await qroute_router.list_devices(current_user=None)
        assert sorted(d["provider"] for d in second) == ["fast", "slow"]
        assert (fast.calls, slow.calls) == (1, 1), "cached providers must not be re-fetched"

        # A concurrent burst joins the in-flight refresh instead of stacking up
        # duplicate fetches on the provider.
        qroute_router._device_cache.clear()
        qroute_router._refresh_tasks.clear()
        await asyncio.gather(*(qroute_router.list_devices(current_user=None) for _ in range(5)))
        assert fast.calls == 2, f"expected one shared refresh, got {fast.calls - 1}"


def test_slow_provider_cannot_blow_the_request_budget():
    _run(_scenario())


if __name__ == "__main__":
    test_slow_provider_cannot_blow_the_request_budget()
    print("ok")
