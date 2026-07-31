"""Stage 1 of the QAOA learning-path pipeline: classical pre-filter.

Cuts the full ~93-topic roadmap down to a small candidate set (<= MAX_CANDIDATES)
before Stage 2 (learning_qaoa.py) ever builds a QUBO. QAOA on AerSimulator cannot
handle 93 qubits (state space = 2^93), so this stage does the cheap classical
filtering/ranking and Stage 2 only ever sees a handful of qubits.
"""
from typing import Any, Dict, List, Optional

from services.roadmap_seed import SEED_TOPICS

MAX_CANDIDATES = 12  # hard cap == qubit count Stage 2 runs QAOA on
WEAK_MASTERY_THRESHOLD = 70.0

# Not derived from any measured signal -- a tunable weighting of foundational
# domains (maths/physics) over the advanced elective (ML), so the recommender
# nudges toward building fundamentals first. Domains absent from this map
# (or a topic with no "domain" field, matching SEED_TOPICS' quantum-computing
# default) fall back to DEFAULT_CATEGORY_MULTIPLIER.
CATEGORY_PRIORITY_MULTIPLIER = {
    "quantum-maths": 1.3,
    "quantum-physics": 1.3,
    "quantum-computing": 1.0,
    "quantum-communication": 1.0,
    "quantum-machine-learning": 0.9,
}
DEFAULT_CATEGORY_MULTIPLIER = 1.0


async def _fetch_topics(db) -> List[Dict[str, Any]]:
    if db is not None:
        try:
            topics = await db.roadmap_topics.find({}).to_list(length=200)
            if topics:
                return topics
        except Exception:
            pass
    return SEED_TOPICS


async def _fetch_completed_slugs(db, firebase_uid: str) -> set:
    """Which topics this user has completed -- the prerequisite-satisfaction
    check below only cares about completion, not in-progress/locked state."""
    if db is None:
        return set()
    try:
        cursor = db.user_progress.find({"firebase_uid": firebase_uid, "status": "completed"})
        records = await cursor.to_list(length=200)
    except Exception:
        return set()
    return {r["topic_slug"] for r in records if r.get("topic_slug")}


async def _fetch_mastery_map(db, firebase_uid: str) -> Dict[str, float]:
    """Average score_pct per topic_slug across the user's quiz_attempts,
    mirroring quiz.py's existing per-topic aggregation pipeline. A topic
    absent from this map has never been quizzed and defaults to
    mastery_score=0 in get_weak_topic_candidates -- the weakest possible
    signal, which is the right default for a "what to learn next" recommender."""
    if db is None:
        return {}
    pipeline = [
        {"$match": {"firebase_uid": firebase_uid}},
        {"$group": {"_id": "$topic_slug", "avg_score_pct": {"$avg": "$score_pct"}}},
    ]
    try:
        results = await db.quiz_attempts.aggregate(pipeline).to_list(length=200)
    except Exception:
        return {}
    return {r["_id"]: r["avg_score_pct"] for r in results if r.get("_id") is not None}


def _is_unlocked(topic: Dict[str, Any], completed_slugs: set) -> bool:
    prereqs = topic.get("prerequisites", [])
    return not prereqs or all(p in completed_slugs for p in prereqs)


def build_candidates(
    topics: List[Dict[str, Any]],
    completed_slugs: set,
    mastery_map: Dict[str, float],
    max_session_minutes: int,
) -> List[Dict[str, Any]]:
    """Pure filtering/ranking logic, separated from the DB I/O above so it's
    directly unit-testable against hand-built fixtures."""
    candidates = []
    for topic in topics:
        slug = topic.get("slug")
        if not slug:
            continue
        if not _is_unlocked(topic, completed_slugs):
            continue

        estimated_minutes = int(topic.get("estimated_minutes", 30))
        if estimated_minutes > max_session_minutes:
            # Can never fit alone in Stage 2's knapsack constraint --
            # cheaper to drop it here than let QAOA "consider" a topic
            # that's infeasible by itself.
            continue

        mastery_score = float(mastery_map.get(slug, 0.0))
        if mastery_score >= WEAK_MASTERY_THRESHOLD:
            continue

        category = topic.get("domain") or "quantum-computing"
        multiplier = CATEGORY_PRIORITY_MULTIPLIER.get(category, DEFAULT_CATEGORY_MULTIPLIER)
        weight = (100.0 - mastery_score) * multiplier

        candidates.append({
            "slug": slug,
            "title": topic.get("title", slug),
            "time": estimated_minutes,
            "weight": round(weight, 2),
            "mastery_score": mastery_score,
            "category": category,
        })

    candidates.sort(key=lambda c: c["weight"], reverse=True)
    return candidates[:MAX_CANDIDATES]


async def get_weak_topic_candidates(
    db,
    firebase_uid: str,
    max_session_minutes: int,
    topics_override: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Stage 1 entry point: unlocked topics with mastery_score < 70, weighted
    by (100 - mastery_score) * category_priority_multiplier, sorted
    descending, truncated to MAX_CANDIDATES so Stage 2's QAOA never sees more
    qubits than it can handle. `topics_override` is test-only (skip the DB
    topic fetch, still exercise the real prereq/mastery DB calls)."""
    topics = topics_override if topics_override is not None else await _fetch_topics(db)
    completed_slugs = await _fetch_completed_slugs(db, firebase_uid)
    mastery_map = await _fetch_mastery_map(db, firebase_uid)

    return build_candidates(topics, completed_slugs, mastery_map, max_session_minutes)
