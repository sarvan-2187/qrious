import asyncio

from services.topic_prefilter import build_candidates, get_weak_topic_candidates, MAX_CANDIDATES, WEAK_MASTERY_THRESHOLD


def _topic(slug, minutes=20, domain="quantum-computing", prereqs=None):
    return {
        "slug": slug, "title": slug.title(), "domain": domain,
        "estimated_minutes": minutes, "prerequisites": prereqs or [],
    }


def test_weak_mastery_filter_excludes_scores_above_threshold():
    topics = [_topic("weak"), _topic("strong")]
    mastery = {"weak": 40.0, "strong": 85.0}
    candidates = build_candidates(topics, set(), mastery, max_session_minutes=60)
    slugs = [c["slug"] for c in candidates]
    assert "weak" in slugs
    assert "strong" not in slugs


def test_missing_mastery_defaults_to_zero_and_is_included():
    topics = [_topic("never_quizzed")]
    candidates = build_candidates(topics, set(), {}, max_session_minutes=60)
    assert len(candidates) == 1
    assert candidates[0]["mastery_score"] == 0.0
    assert candidates[0]["weight"] == 100.0  # (100 - 0) * 1.0 multiplier


def test_locked_topics_with_unmet_prerequisites_are_excluded():
    topics = [_topic("locked", prereqs=["never-completed"])]
    candidates = build_candidates(topics, set(), {}, max_session_minutes=60)
    assert candidates == []


def test_topics_with_completed_prerequisites_are_unlocked():
    topics = [_topic("unlockable", prereqs=["done"])]
    candidates = build_candidates(topics, {"done"}, {}, max_session_minutes=60)
    assert len(candidates) == 1


def test_topic_exceeding_budget_alone_is_dropped():
    topics = [_topic("too_long", minutes=999)]
    candidates = build_candidates(topics, set(), {}, max_session_minutes=45)
    assert candidates == []


def test_truncated_to_max_candidates_hard_cap():
    topics = [_topic(f"t{i}") for i in range(25)]
    mastery = {f"t{i}": 0.0 for i in range(25)}  # all weak, all tied weight
    candidates = build_candidates(topics, set(), mastery, max_session_minutes=1000)
    assert len(candidates) == MAX_CANDIDATES


def test_sorted_by_weight_descending():
    topics = [_topic("low"), _topic("high"), _topic("mid")]
    mastery = {"low": 60.0, "high": 10.0, "mid": 35.0}
    candidates = build_candidates(topics, set(), mastery, max_session_minutes=60)
    assert [c["slug"] for c in candidates] == ["high", "mid", "low"]


def test_category_priority_multiplier_breaks_ties_in_weight():
    topics = [_topic("maths_topic", domain="quantum-maths"), _topic("ml_topic", domain="quantum-machine-learning")]
    mastery = {"maths_topic": 50.0, "ml_topic": 50.0}  # identical raw gap
    candidates = build_candidates(topics, set(), mastery, max_session_minutes=60)
    by_slug = {c["slug"]: c["weight"] for c in candidates}
    assert by_slug["maths_topic"] > by_slug["ml_topic"]  # foundational domain weighted higher


def test_get_weak_topic_candidates_with_no_db_uses_topics_override():
    topics = [_topic("only_one")]

    async def run():
        return await get_weak_topic_candidates(None, "test_uid", 60, topics_override=topics)

    candidates = asyncio.run(run())
    assert len(candidates) == 1
    assert candidates[0]["slug"] == "only_one"


def test_get_weak_topic_candidates_reads_mastery_and_progress_from_mock_db():
    """Mock MongoDB data across a few mastery_score distributions, per the
    spec's Stage 1 test requirement -- exercises the real aggregate/find
    async DB calls with lightweight async stub collections instead of a
    real Mongo instance."""

    class _FakeCursor:
        def __init__(self, docs):
            self._docs = docs

        async def to_list(self, length=None):
            return self._docs

    class _FakeUserProgressCollection:
        def __init__(self, docs):
            self._docs = docs

        def find(self, query):
            status = query.get("status")
            uid = query.get("firebase_uid")
            return _FakeCursor([
                d for d in self._docs
                if d.get("firebase_uid") == uid and (status is None or d.get("status") == status)
            ])

    class _FakeQuizAttemptsCollection:
        def __init__(self, docs):
            self._docs = docs

        def aggregate(self, pipeline):
            uid = pipeline[0]["$match"]["firebase_uid"]
            by_topic = {}
            for d in self._docs:
                if d.get("firebase_uid") != uid:
                    continue
                by_topic.setdefault(d["topic_slug"], []).append(d["score_pct"])
            results = [
                {"_id": slug, "avg_score_pct": sum(scores) / len(scores)}
                for slug, scores in by_topic.items()
            ]
            return _FakeCursor(results)

    class _FakeDB:
        def __init__(self):
            self.user_progress = _FakeUserProgressCollection([
                {"firebase_uid": "uid1", "topic_slug": "prereq-a", "status": "completed"},
            ])
            self.quiz_attempts = _FakeQuizAttemptsCollection([
                {"firebase_uid": "uid1", "topic_slug": "weak-topic", "score_pct": 30.0},
                {"firebase_uid": "uid1", "topic_slug": "weak-topic", "score_pct": 50.0},  # avg 40
                {"firebase_uid": "uid1", "topic_slug": "mastered-topic", "score_pct": 95.0},
            ])

    topics = [
        _topic("weak-topic", prereqs=["prereq-a"]),
        _topic("mastered-topic"),
        _topic("locked-topic", prereqs=["not-done"]),
    ]

    async def run():
        return await get_weak_topic_candidates(_FakeDB(), "uid1", 60, topics_override=topics)

    candidates = asyncio.run(run())
    slugs = {c["slug"] for c in candidates}
    assert slugs == {"weak-topic"}
    assert candidates[0]["mastery_score"] == 40.0
    assert candidates[0]["mastery_score"] < WEAK_MASTERY_THRESHOLD
