"""Lightweight usage tracking on top of the existing MongoDB instance — no
new database, per the task spec (§19). One document per gateway call in a
new `ai_usage` collection, written best-effort: a Mongo hiccup must never
fail the actual AI request, so every write here is wrapped and swallowed
(logged, not raised).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from ai.models import UsageRecord


async def record_usage(db: Any, record: UsageRecord) -> None:
    if db is None:
        return
    try:
        doc = record.model_dump()
        doc["timestamp"] = datetime.now(timezone.utc)
        await db.ai_usage.insert_one(doc)
    except Exception as exc:  # best-effort never let telemetry break a request
        print(f"[AI Gateway] usage write failed (non-fatal): {type(exc).__name__}: {exc}", flush=True)


async def get_usage_summary(db: Any, since: Optional[datetime] = None) -> list[dict]:
    """Aggregated per-provider stats — requests, success/failure counts,
    average latency, fallback rate, token totals. Used by an admin-only
    surface (or ad hoc inspection); intentionally not exposed on the public
    /api/ai/health endpoint (§18's "do not expose sensitive account/quota
    information publicly")."""
    if db is None:
        return []
    match: dict = {}
    if since is not None:
        match["timestamp"] = {"$gte": since}
    pipeline: list[dict] = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({
        "$group": {
            "_id": {"provider": "$provider", "task": "$task"},
            "requests": {"$sum": 1},
            "successes": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}},
            "failures": {"$sum": {"$cond": [{"$eq": ["$status", "failure"]}, 1, 0]}},
            "fallbacks": {"$sum": {"$cond": ["$fallback_used", 1, 0]}},
            "avg_latency_ms": {"$avg": "$latency_ms"},
            "total_input_tokens": {"$sum": {"$ifNull": ["$input_tokens", 0]}},
            "total_output_tokens": {"$sum": {"$ifNull": ["$output_tokens", 0]}},
        }
    })
    try:
        cursor = db.ai_usage.aggregate(pipeline)
        return [doc async for doc in cursor]
    except Exception as exc:
        print(f"[AI Gateway] usage summary query failed: {type(exc).__name__}: {exc}", flush=True)
        return []
