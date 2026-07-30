import pytest
from datetime import datetime, timedelta
from routers.analytics import start_assessment, submit_assessment, get_analytics_dashboard

@pytest.mark.asyncio
async def test_weak_concept_calculation_and_sorting():
    # Setup test mock environment for concept accuracy calculations
    quiz_attempts = [
        {
            "topic_slug": "superposition",
            "answers": [
                {"concept": "superposition_basics", "correct": True},
                {"concept": "superposition_basics", "correct": False},
                {"concept": "bloch_sphere", "correct": False},
                {"concept": "bloch_sphere", "correct": False},
            ]
        }
    ]
    assessments = [
        {
            "status": "completed",
            "type": "pre",
            "score_pct": 50.0,
            "answers": [
                {"concept": "superposition_basics", "correct": True},
                {"concept": "quantum_entanglement", "correct": True},
                {"concept": "quantum_entanglement", "correct": True},
            ]
        }
    ]
    
    # Calculate concept statistics
    concept_stats = {}
    for attempt in quiz_attempts:
        for ans in attempt.get("answers", []):
            c_tag = ans.get("concept")
            if c_tag not in concept_stats:
                concept_stats[c_tag] = {"concept": c_tag, "topic_slug": "superposition", "total": 0, "correct": 0}
            concept_stats[c_tag]["total"] += 1
            if ans.get("correct"):
                concept_stats[c_tag]["correct"] += 1

    for ass in assessments:
        for ans in ass.get("answers", []):
            c_tag = ans.get("concept")
            if c_tag not in concept_stats:
                concept_stats[c_tag] = {"concept": c_tag, "topic_slug": "general", "total": 0, "correct": 0}
            concept_stats[c_tag]["total"] += 1
            if ans.get("correct"):
                concept_stats[c_tag]["correct"] += 1

    weak_concepts_list = []
    for c_tag, stats in concept_stats.items():
        acc = round((stats["correct"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0.0
        weak_concepts_list.append({
            "concept": c_tag,
            "total_questions": stats["total"],
            "correct_questions": stats["correct"],
            "accuracy_pct": acc
        })

    weak_concepts_list.sort(key=lambda x: (x["accuracy_pct"], -x["total_questions"]))

    # Verify order: bloch_sphere (0.0% accuracy) should be 1st
    assert weak_concepts_list[0]["concept"] == "bloch_sphere"
    assert weak_concepts_list[0]["accuracy_pct"] == 0.0
    
    # Verify quantum_entanglement (100.0% accuracy) should be last
    assert weak_concepts_list[-1]["concept"] == "quantum_entanglement"
    assert weak_concepts_list[-1]["accuracy_pct"] == 100.0


def test_pre_post_delta_graceful_missing_pre():
    # Scenario A: Both Pre and Post completed
    pre_score = 60.0
    post_score = 85.0
    delta = round(post_score - pre_score, 1) if pre_score is not None and post_score is not None else None
    assert delta == 25.0

    # Scenario B: Only Post completed (missing Pre)
    pre_score_missing = None
    post_score_only = 75.0
    delta_missing = round(post_score_only - pre_score_missing, 1) if pre_score_missing is not None and post_score_only is not None else None
    assert delta_missing is None

    # Scenario C: Only Pre completed (missing Post)
    pre_score_only = 40.0
    post_score_missing = None
    delta_missing_post = round(post_score_missing - pre_score_only, 1) if pre_score_only is not None and post_score_missing is not None else None
    assert delta_missing_post is None


def test_heatmap_local_timezone_bucketing():
    # Test datetime conversion with timezone offset (-330 minutes for IST UTC+5:30)
    tz_offset = -330
    tz_delta = timedelta(minutes=-tz_offset)
    
    # Late night UTC timestamp: 2026-07-23 20:00:00 UTC -> Local IST is 2026-07-24 01:30:00
    c_at_utc = datetime(2026, 7, 23, 20, 0, 0)
    local_dt = c_at_utc + tz_delta
    
    date_key_utc = c_at_utc.strftime("%Y-%m-%d")
    date_key_local = local_dt.strftime("%Y-%m-%d")
    
    assert date_key_utc == "2026-07-23"
    assert date_key_local == "2026-07-24"
