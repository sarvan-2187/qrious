import pytest
import time
from routers.analytics import (
    compute_pre_post_delta_info,
    get_cached_analytics,
    set_cached_analytics,
    invalidate_analytics_cache,
    ANALYTICS_CACHE
)

def test_pre_post_delta_both_scores_excellent_progress():
    res = compute_pre_post_delta_info(pre_score=60.0, post_score=85.0, total_evaluations=2)
    assert res["pre_score_pct"] == 60.0
    assert res["post_score_pct"] == 85.0
    assert res["delta_pct"] == 25.0
    assert res["performance_classification"] == "Excellent Progress"
    assert res["confidence_pct"] == 85
    assert "+25.0% score gain" in res["improvement_text"]

def test_pre_post_delta_consistent_improvement():
    res = compute_pre_post_delta_info(pre_score=70.0, post_score=78.0, total_evaluations=3)
    assert res["delta_pct"] == 8.0
    assert res["performance_classification"] == "Consistent Improvement"
    assert res["confidence_pct"] == 90

def test_pre_post_delta_needs_reinforcement():
    res = compute_pre_post_delta_info(pre_score=80.0, post_score=65.0, total_evaluations=1)
    assert res["delta_pct"] == -15.0
    assert res["performance_classification"] == "Needs Reinforcement"

def test_pre_post_delta_pre_only():
    res = compute_pre_post_delta_info(pre_score=75.0, post_score=None)
    assert res["pre_score_pct"] == 75.0
    assert res["post_score_pct"] is None
    assert res["delta_pct"] is None
    assert res["performance_classification"] == "Baseline Established"
    assert res["confidence_pct"] == 75

def test_pre_post_delta_post_only():
    res = compute_pre_post_delta_info(pre_score=None, post_score=90.0)
    assert res["pre_score_pct"] is None
    assert res["post_score_pct"] == 90.0
    assert res["delta_pct"] is None
    assert res["performance_classification"] == "Post-Assessment Completed"

def test_pre_post_delta_pending():
    res = compute_pre_post_delta_info(pre_score=None, post_score=None)
    assert res["delta_pct"] is None
    assert res["performance_classification"] == "Pending Assessment"
    assert res["confidence_pct"] == 0

def test_analytics_ttl_response_caching_and_invalidation():
    uid = "test_user_cache_123"
    cache_key = f"{uid}_all_0"
    test_payload = {"data": {"overall_accuracy_pct": 88.5}}

    # 1. Set cache
    set_cached_analytics(cache_key, test_payload)

    # 2. Get cache (hit)
    cached = get_cached_analytics(cache_key)
    assert cached is not None
    assert cached["data"]["overall_accuracy_pct"] == 88.5

    # 3. Invalidate cache
    invalidate_analytics_cache(uid)
    assert get_cached_analytics(cache_key) is None
