import random
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel

from database import get_db
from auth import get_verified_firebase_user
from services.quiz_grading_service import quiz_grading_service
from services.xp_engine import xp_engine
from services.streak_engine import streak_engine
from services.badge_engine import badge_engine
from services.demo_seed import seed_demo_user_history
from services.email_service import send_email
from services.topic_assessment_service import generate_topic_assessment_questions
from ai.gateway import AIGateway

router = APIRouter(prefix="/api/v1/learning", tags=["Analytics & Assessments"])

# Response TTL Cache for Analytics Dashboard (30s TTL)
ANALYTICS_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 30

def get_cached_analytics(cache_key: str) -> Optional[Dict[str, Any]]:
    if cache_key in ANALYTICS_CACHE:
        entry = ANALYTICS_CACHE[cache_key]
        if time.time() - entry["timestamp"] < CACHE_TTL_SECONDS:
            return entry["data"]
        else:
            del ANALYTICS_CACHE[cache_key]
    return None

def set_cached_analytics(cache_key: str, data: Dict[str, Any]):
    ANALYTICS_CACHE[cache_key] = {
        "timestamp": time.time(),
        "data": data
    }

def invalidate_analytics_cache(firebase_uid: str):
    prefix = f"{firebase_uid}_"
    keys_to_delete = [k for k in ANALYTICS_CACHE if k.startswith(prefix)]
    for k in keys_to_delete:
        ANALYTICS_CACHE.pop(k, None)

def compute_pre_post_delta_info(
    pre_score: Optional[float],
    post_score: Optional[float],
    total_evaluations: int = 1
) -> Dict[str, Any]:
    """Pure calculation helper for Pre/Post learning gain and statistical confidence estimation."""
    if pre_score is not None and post_score is not None:
        delta = round(post_score - pre_score, 1)
        if delta >= 15.0:
            perf_class = "Excellent Progress"
            academic_rec = "Your performance demonstrates significant conceptual score growth. Continue practicing advanced algorithm applications to consolidate mastery."
        elif delta >= 5.0:
            perf_class = "Consistent Improvement"
            academic_rec = "Solid progress demonstrated across core topics. Focus on reviewing targeted concept edge cases."
        elif delta >= -5.0:
            perf_class = "Stable Performance"
            academic_rec = "Steady conceptual understanding. Recommended to complete additional problem sets before the next evaluation."
        else:
            perf_class = "Needs Reinforcement"
            academic_rec = "Review fundamental Dirac notation and gate transformation mechanics before attempting higher tier topics."
        imp_text = f"{'+' if delta >= 0 else ''}{delta}% score gain between pre and post assessment."
        confidence_level = min(98, max(60, 75 + (total_evaluations * 5)))
    elif pre_score is not None:
        delta = None
        perf_class = "Baseline Established"
        academic_rec = "Baseline pre-assessment complete. Work through course modules and practice quizzes to unlock your post-assessment evaluation."
        imp_text = f"Baseline pre-assessment score: {pre_score}%."
        confidence_level = 75
    elif post_score is not None:
        delta = None
        perf_class = "Post-Assessment Completed"
        academic_rec = "Post-assessment score recorded. Take a baseline pre-assessment to measure overall learning gain."
        imp_text = f"Post-assessment score: {post_score}%."
        confidence_level = 80
    else:
        delta = None
        perf_class = "Pending Assessment"
        academic_rec = "No pre or post assessment completed yet. Take the pre-assessment to establish your baseline proficiency score."
        imp_text = "Take the pre-assessment to establish your baseline!"
        confidence_level = 0

    return {
        "pre_score_pct": pre_score,
        "post_score_pct": post_score,
        "delta_pct": delta,
        "confidence_pct": confidence_level,
        "performance_classification": perf_class,
        "academic_recommendation": academic_rec,
        "improvement_text": imp_text
    }


def format_doc(doc: Any) -> Any:
    """Recursively converts BSON ObjectId instances to strings for clean JSON serialization."""
    if isinstance(doc, dict):
        return {k: format_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [format_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

def strip_sensitive_answers(question: Dict[str, Any]) -> Dict[str, Any]:
    """Strips correct_answer and wrong_answer_feedback before returning questions to client."""
    q_copy = format_doc(dict(question))
    q_copy.pop("correct_answer", None)
    q_copy.pop("wrong_answer_feedback", None)
    
    if "options" in q_copy and isinstance(q_copy["options"], list):
        shuffled_options = list(q_copy["options"])
        random.shuffle(shuffled_options)
        q_copy["options"] = shuffled_options
        
    return q_copy

@router.post("/assessments/{type}/start", summary="Start a Pre or Post Assessment session")
async def start_assessment(
    type: str,
    topic_slug: Optional[str] = Query(None),
    count: int = Query(10, ge=1, le=25),
    difficulty: Optional[str] = Query(None),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    if type.lower() not in ["pre", "post"]:
        raise HTTPException(status_code=400, detail="Assessment type must be 'pre' or 'post'")

    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")

    if topic_slug:
        topic = await db.roadmap_topics.find_one({"slug": topic_slug})
        if not topic:
            # Fallback to seed topics if missing from DB for some reason
            from seed.roadmap_data import SEED_TOPICS
            topic = next((t for t in SEED_TOPICS if t["slug"] == topic_slug), None)
            if not topic:
                raise HTTPException(status_code=404, detail="Topic not found")
        
        gateway = AIGateway()
        questions = await generate_topic_assessment_questions(topic, type.lower(), firebase_uid, gateway)
        if not questions:
            raise HTTPException(status_code=500, detail="Failed to generate topic assessment questions")
            
        selected_questions = questions
        q_ids = [q["_id"] for q in selected_questions]
    else:
        query: Dict[str, Any] = {}
        if difficulty:
            query["difficulty"] = difficulty.lower()
    
        cursor = db.quiz_questions.find(query)
        all_questions = await cursor.to_list(length=200)
    
        if not all_questions:
            raise HTTPException(status_code=404, detail="No questions available for assessment")
    
        sample_size = min(count, len(all_questions))
        selected_questions = random.sample(all_questions, sample_size)
        q_ids = [q["_id"] for q in selected_questions]

    # Create assessment document
    assessment_doc = {
        "firebase_uid": firebase_uid,
        "type": type.lower(),
        "topic_slug": topic_slug,
        "topic_scope": list(set(q.get("topic_slug", "general") for q in selected_questions)),
        "question_ids": q_ids,

        "status": "started",
        "answers": [],
        "score_pct": 0.0,
        "xp_earned": 0,
        "taken_at": datetime.utcnow()
    }

    if topic_slug:
        assessment_doc["questions_full"] = selected_questions

    result = await db.assessments.insert_one(assessment_doc)
    assessment_id = str(result.inserted_id)

    safe_questions = [strip_sensitive_answers(q) for q in selected_questions]

    return {
        "data": {
            "assessment_id": assessment_id,
            "type": type.lower(),
            "questions": safe_questions,
            "total_questions": len(safe_questions),
            "estimated_minutes": len(safe_questions) * 2
        },
        "meta": None,
        "error": None
    }

@router.post("/assessments/{id}/submit", summary="Submit pre or post assessment answers for grading")
async def submit_assessment(
    id: str,
    payload: Dict[str, Any],
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid assessment ID format")

    assessment_oid = ObjectId(id)
    assessment = await db.assessments.find_one({"_id": assessment_oid, "firebase_uid": firebase_uid})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    answers_input = payload.get("answers", [])
    if not answers_input:
        raise HTTPException(status_code=400, detail="No answers provided in payload")

    question_ids = assessment.get("question_ids", [])
    questions_full = assessment.get("questions_full")
    
    if questions_full:
        # AI-generated questions have UUID _id values — stringify them consistently
        questions_map = {str(q["_id"]): q for q in questions_full}
    else:
        q_cursor = db.quiz_questions.find({"_id": {"$in": question_ids}})
        raw_questions = await q_cursor.to_list(length=len(question_ids))
        questions_map = {str(q["_id"]): q for q in raw_questions}

    graded_answers = []
    total_correct = 0
    total_xp_earned = 0

    for user_ans in answers_input:
        q_id_str = str(user_ans.get("question_id"))
        selected_val = user_ans.get("selected")
        time_taken = user_ans.get("time_taken_s", 0)

        q_obj = questions_map.get(q_id_str)
        if not q_obj:
            continue

        is_correct, xp_earned, feedback = quiz_grading_service.grade_question(q_obj, selected_val)

        if is_correct:
            total_correct += 1
            total_xp_earned += int(xp_earned)

        # Handle both ObjectId and UUID types for _id
        q_id_oid = q_id_str  # keep as string for UUID-based AI-generated questions
        if ObjectId.is_valid(q_id_str):
            q_id_oid = ObjectId(q_id_str)

        graded_answers.append({
            "question_id": q_id_oid,
            "concept": q_obj.get("concept", q_obj.get("topic_slug", "quantum")),
            "topic_slug": q_obj.get("topic_slug", "general"),
            "selected": selected_val,
            "correct": is_correct,
            "xp_earned": int(xp_earned),
            "time_taken_s": time_taken,
            "explanation": feedback
        })

    total_questions = len(question_ids)
    score_pct = round((total_correct / total_questions) * 100, 1) if total_questions > 0 else 0.0

    # Award XP
    xp_result = await xp_engine.award_xp(
        db=db,
        firebase_uid=firebase_uid,
        source="assessment",
        amount=total_xp_earned,
        source_ref_id=assessment_oid,
        idempotent_key=f"assessment_{id}"
    )

    # Touch daily activity streak
    streak_result = await streak_engine.record_daily_activity(db, firebase_uid)

    # Evaluate newly unlocked badges
    unlocked_badges = await badge_engine.check_and_award_badges(db, firebase_uid)

    now = datetime.utcnow()
    await db.assessments.update_one(
        {"_id": assessment_oid},
        {
            "$set": {
                "answers": graded_answers,
                "score_pct": score_pct,
                "total_correct": total_correct,
                "total_questions": total_questions,
                "xp_earned": total_xp_earned,
                "status": "completed",
                "submitted_at": now
            }
        }
    )

    # Invalidate cached analytics response for this user
    invalidate_analytics_cache(firebase_uid)

    return {
        "data": {
            "assessment_id": id,
            "type": assessment.get("type"),
            "score_pct": score_pct,
            "total_correct": total_correct,
            "total_questions": total_questions,
            "xp_earned": total_xp_earned,
            "graded_answers": format_doc(graded_answers),
            "xp_summary": xp_result,
            "streak_summary": streak_result,
            "newly_unlocked_badges": format_doc(unlocked_badges)
        },
        "meta": None,
        "error": None
    }

@router.get("/analytics/dashboard", summary="Get comprehensive learning analytics and assessment performance")
async def get_analytics_dashboard(
    tz_offset: int = Query(0, description="User local timezone offset in minutes from UTC (e.g. -330 for IST)"),
    roadmap_id: Optional[str] = Query(None, description="Optional roadmap ID filter for scoped metrics"),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")

    # Check Response TTL Cache
    cache_key = f"{firebase_uid}_{roadmap_id or 'all'}_{tz_offset}"
    cached_payload = get_cached_analytics(cache_key)
    if cached_payload:
        return cached_payload

    # 1. Gather all completed quiz attempts & assessments for THIS user
    quiz_query: Dict[str, Any] = {"firebase_uid": firebase_uid}
    assessments_query: Dict[str, Any] = {"firebase_uid": firebase_uid, "status": "completed"}

    roadmap_topics = []
    if isinstance(roadmap_id, str) and roadmap_id.strip() != "" and roadmap_id != "all":
        # Resolve topics for this roadmap or match topic_slug/roadmap_id directly
        roadmap_topics = await db.roadmap_topics.find({"$or": [{"roadmap_id": roadmap_id}, {"domain": roadmap_id}]}).sort("order_index", 1).to_list(length=100)
        topic_slugs = [t.get("slug") for t in roadmap_topics if "slug" in t]
        if not topic_slugs:
            topic_slugs = [roadmap_id]

        quiz_query["$or"] = [{"roadmap_id": roadmap_id}, {"topic_slug": {"$in": topic_slugs}}]
        assessments_query["$or"] = [{"roadmap_id": roadmap_id}, {"difficulty": roadmap_id}, {"topic_slug": {"$in": topic_slugs}}]

    quiz_cursor = db.quiz_attempts.find(quiz_query).sort("submitted_at", -1)
    quiz_attempts = await quiz_cursor.to_list(length=100)

    assessments_cursor = db.assessments.find(assessments_query).sort("submitted_at", -1)
    assessments = await assessments_cursor.to_list(length=100)

    # Real User metadata from DB
    user_doc = await db.users.find_one({"firebase_uid": firebase_uid}) or {}
    user_streak_info = user_doc.get("streak", {})
    current_streak = user_streak_info.get("current_streak", 0)
    longest_streak = user_streak_info.get("longest_streak", current_streak)

    # 2. Compute Real Concept Mastery Matrix across all quiz & assessment answers
    concept_stats: Dict[str, Dict[str, Any]] = {}

    for attempt in quiz_attempts:
        for ans in attempt.get("answers", []):
            c_tag = ans.get("concept") or attempt.get("topic_slug") or "General Quantum"
            t_slug = attempt.get("topic_slug", "general")
            if c_tag not in concept_stats:
                concept_stats[c_tag] = {"concept": c_tag, "topic_slug": t_slug, "total": 0, "correct": 0}
            concept_stats[c_tag]["total"] += 1
            if ans.get("correct"):
                concept_stats[c_tag]["correct"] += 1

    for ass in assessments:
        for ans in ass.get("answers", []):
            c_tag = ans.get("concept") or ans.get("topic_slug") or "General Quantum"
            t_slug = ans.get("topic_slug", "general")
            if c_tag not in concept_stats:
                concept_stats[c_tag] = {"concept": c_tag, "topic_slug": t_slug, "total": 0, "correct": 0}
            concept_stats[c_tag]["total"] += 1
            if ans.get("correct"):
                concept_stats[c_tag]["correct"] += 1

    concept_mastery_matrix = []
    total_q_attempted = 0
    total_q_correct = 0

    for c_tag, stats in concept_stats.items():
        total_q_attempted += stats["total"]
        total_q_correct += stats["correct"]
        acc = round((stats["correct"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0.0
        
        # Determine status based on actual accuracy
        if acc >= 90.0:
            status = "mastered"
        elif acc >= 75.0:
            status = "strong"
        elif acc >= 65.0:
            status = "review"
        else:
            status = "needs_attention"

        concept_mastery_matrix.append({
            "concept": c_tag,
            "topic_slug": stats["topic_slug"],
            "total_questions": stats["total"],
            "correct_questions": stats["correct"],
            "accuracy_pct": acc,
            "status": status
        })

    # Priority sorting for Matrix: needs_attention -> review -> strong -> mastered
    STATUS_PRIORITY = {"needs_attention": 0, "review": 1, "strong": 2, "mastered": 3}
    concept_mastery_matrix.sort(key=lambda x: (STATUS_PRIORITY.get(x["status"], 9), x["accuracy_pct"]))

    weak_concepts = [c for c in concept_mastery_matrix if c["status"] in ["needs_attention", "review"]]
    if not weak_concepts:
        weak_concepts = concept_mastery_matrix[:3]

    # 3. Compute Real Pre/Post Assessment Learning Report via calculation helper
    pre_ass = next((a for a in assessments if a.get("type") == "pre"), None)
    post_ass = next((a for a in assessments if a.get("type") == "post"), None)

    pre_score = pre_ass.get("score_pct") if pre_ass else None
    post_score = post_ass.get("score_pct") if post_ass else None

    pre_post_delta = compute_pre_post_delta_info(
        pre_score=pre_score,
        post_score=post_score,
        total_evaluations=len(assessments)
    )
    delta = pre_post_delta.get("delta_pct")

    # 3.5 Topic Assessment Breakdown — always built from all assessed topics the user has taken
    # When a roadmap filter is active we use its topic list; otherwise we derive topics from the assessments themselves.
    topic_assessment_breakdown = []
    
    if roadmap_topics:
        # Roadmap filter active: show all topics in that domain, annotated with scores
        assessed_topics = roadmap_topics
        topic_meta = {t.get("slug"): t for t in roadmap_topics}
    else:
        # No filter: discover unique topic_slugs from completed assessments
        seen_slugs = {}
        for a in assessments:
            t_slug = a.get("topic_slug")
            if t_slug and t_slug not in seen_slugs:
                seen_slugs[t_slug] = a
        
        if seen_slugs:
            # Try to enrich with DB metadata, fall back to slug-based title
            db_topics = await db.roadmap_topics.find({"slug": {"$in": list(seen_slugs.keys())}}).to_list(length=100)
            topic_meta = {t.get("slug"): t for t in db_topics}
            assessed_topics = [
                topic_meta.get(slug, {"slug": slug, "title": slug.replace("-", " ").title(), "order_index": i})
                for i, slug in enumerate(seen_slugs.keys())
            ]
        else:
            assessed_topics = []
            topic_meta = {}

    for t in assessed_topics:
        t_slug = t.get("slug")
        if not t_slug:
            continue
        
        # Find the most recent pre and post tests for this specific topic
        t_pre = next((a for a in assessments if a.get("type") == "pre" and a.get("topic_slug") == t_slug), None)
        t_post = next((a for a in assessments if a.get("type") == "post" and a.get("topic_slug") == t_slug), None)
        
        # Only include topics that have at least one assessment taken
        if not roadmap_topics and t_pre is None and t_post is None:
            continue
        
        pre_side = {
            "taken": t_pre is not None,
            "score_pct": t_pre.get("score_pct") if t_pre else None,
            "total_correct": t_pre.get("total_correct", 0) if t_pre else 0,
            "total_questions": t_pre.get("total_questions", 0) if t_pre else 0,
            "taken_at": t_pre.get("submitted_at").isoformat() if t_pre and t_pre.get("submitted_at") else None
        }
        
        post_side = {
            "taken": t_post is not None,
            "score_pct": t_post.get("score_pct") if t_post else None,
            "total_correct": t_post.get("total_correct", 0) if t_post else 0,
            "total_questions": t_post.get("total_questions", 0) if t_post else 0,
            "taken_at": t_post.get("submitted_at").isoformat() if t_post and t_post.get("submitted_at") else None
        }
        
        t_delta_info = compute_pre_post_delta_info(
            pre_score=pre_side["score_pct"],
            post_score=post_side["score_pct"]
        )
        
        topic_assessment_breakdown.append({
            "topic_slug": t_slug,
            "topic_title": t.get("title", t_slug),
            "order_index": t.get("order_index", 0),
            "pre": pre_side,
            "post": post_side,
            "delta_pct": t_delta_info.get("delta_pct"),
            "performance_classification": t_delta_info.get("performance_classification"),
            "academic_recommendation": t_delta_info.get("academic_recommendation")
        })

    # 4. Accuracy Trend (real merged timeline of actual quizzes & assessments)
    combined_timeline = []
    for att in quiz_attempts:
        sub_time = att.get("submitted_at") or att.get("started_at")
        if sub_time:
            dt_str = sub_time.strftime("%b %d") if isinstance(sub_time, datetime) else str(sub_time)[:10]
            max_s = att.get("max_score", 100)
            score_p = round((att.get("score", 0) / max_s) * 100, 1) if max_s > 0 else 0.0
            combined_timeline.append({
                "session_type": "quiz",
                "title": f"Quiz: {att.get('topic_slug', 'general').replace('_', ' ').title()}",
                "score_pct": score_p,
                "taken_at": dt_str,
                "dt": sub_time
            })

    for ass in assessments:
        sub_time = ass.get("submitted_at") or ass.get("taken_at")
        if sub_time:
            dt_str = sub_time.strftime("%b %d") if isinstance(sub_time, datetime) else str(sub_time)[:10]
            combined_timeline.append({
                "session_type": f"{ass.get('type', 'pre').capitalize()} Assessment",
                "title": f"{ass.get('type', 'pre').capitalize()} Assessment",
                "score_pct": ass.get("score_pct", 0.0),
                "taken_at": dt_str,
                "dt": sub_time
            })

    combined_timeline.sort(key=lambda x: x["dt"])
    trend_slice = combined_timeline[-8:]
    accuracy_trend = [{
        "session_type": item["session_type"],
        "title": item["title"],
        "score_pct": item["score_pct"],
        "taken_at": item["taken_at"]
    } for item in trend_slice]

    if accuracy_trend:
        trend_scores = [t["score_pct"] for t in accuracy_trend]
        best_score = max(trend_scores)
        lowest_score = min(trend_scores)
        trend_diff = round(trend_scores[-1] - trend_scores[0], 1) if len(trend_scores) > 1 else 0.0
        trend_text = f"Accuracy shifted by {'+' if trend_diff >= 0 else ''}{trend_diff}% over the last {len(trend_scores)} learning session(s)."
    else:
        best_score = 0.0
        lowest_score = 0.0
        trend_text = "No quiz or assessment sessions completed yet."

    accuracy_trend_summary = {
        "best_score": best_score,
        "lowest_score": lowest_score,
        "trend_summary": trend_text
    }

    # 5. Activity Heatmap & Real Study Habit Analytics
    xp_cursor = db.xp_history.find({"firebase_uid": firebase_uid})
    xp_entries = await xp_cursor.to_list(length=500)

    daily_map: Dict[str, Dict[str, int]] = {}
    weekly_map: Dict[str, int] = {}
    now_utc = datetime.utcnow()
    tz_delta = timedelta(minutes=-tz_offset)

    total_xp_gained = 0
    for entry in xp_entries:
        total_xp_gained += entry.get("amount", 0)
        c_at = entry.get("created_at")
        if c_at and isinstance(c_at, datetime):
            local_dt = c_at + tz_delta
            date_key = local_dt.strftime("%Y-%m-%d")
            week_key = f"Week {local_dt.isocalendar()[1]}"
            
            if date_key not in daily_map:
                daily_map[date_key] = {"count": 0, "xp_gained": 0}
            daily_map[date_key]["count"] += 1
            daily_map[date_key]["xp_gained"] += entry.get("amount", 0)

            weekly_map[week_key] = weekly_map.get(week_key, 0) + 1

    heatmap_days = []
    study_days_count = 0
    daily_sessions_count = 0

    for i in range(89, -1, -1):
        d_day = (now_utc + tz_delta) - timedelta(days=i)
        d_key = d_day.strftime("%Y-%m-%d")
        day_data = daily_map.get(d_key, {"count": 0, "xp_gained": 0})
        if day_data["count"] > 0:
            study_days_count += 1
            daily_sessions_count += day_data["count"]

        heatmap_days.append({
            "date": d_key,
            "count": day_data["count"],
            "xp_gained": day_data["xp_gained"]
        })

    most_active_week = max(weekly_map.items(), key=lambda x: x[1])[0] if weekly_map else "N/A"
    avg_study_mins = round((total_q_attempted * 2) / max(study_days_count, 1)) if total_q_attempted > 0 else 0

    study_habit_analytics = {
        "study_days": study_days_count,
        "total_xp": total_xp_gained,
        "daily_sessions": daily_sessions_count,
        "longest_streak": longest_streak,
        "current_streak": current_streak,
        "most_active_week": most_active_week,
        "avg_study_time_mins": avg_study_mins
    }

    overall_acc = round((total_q_correct / total_q_attempted) * 100, 1) if total_q_attempted > 0 else 0.0

    # 6. Real Personalized Learning Insights
    if concept_mastery_matrix:
        top_strength_concept = concept_mastery_matrix[-1]["concept"]
        weakest_focus_concept = concept_mastery_matrix[0]["concept"]
        
        personalized_insights = [
            {
                "type": "strength",
                "title": "Conceptual Strength",
                "description": f"You consistently achieve your highest accuracy in {top_strength_concept}."
            },
            {
                "type": "improvement",
                "title": "Improvement Area",
                "description": f"Additional practice is recommended for {weakest_focus_concept} where accuracy currently stands at {concept_mastery_matrix[0]['accuracy_pct']}%."
            },
            {
                "type": "recommendation",
                "title": "Actionable Next Step",
                "description": f"Complete targeted exercises for {weakest_focus_concept} to boost your overall mastery score."
            }
        ]
    else:
        personalized_insights = [
            {
                "type": "strength",
                "title": "Getting Started",
                "description": "Your learning journey begins here. Explore courses, solve gate puzzles, and take your first assessment."
            },
            {
                "type": "improvement",
                "title": "Baseline Assessment",
                "description": "Take the Pre-Assessment test to establish your initial proficiency baseline across quantum concepts."
            },
            {
                "type": "recommendation",
                "title": "Actionable Next Step",
                "description": "Launch the Quantum Playground or Quantum Roadmap to begin earning XP and building concepts."
            }
        ]

    # 7. Real Mastery Progress
    mastered_cnt = sum(1 for c in concept_mastery_matrix if c["status"] == "mastered")
    review_cnt = sum(1 for c in concept_mastery_matrix if c["status"] in ["review", "needs_attention"])
    TOTAL_COURSE_TOPICS = 30
    advanced_rem = max(TOTAL_COURSE_TOPICS - len(concept_mastery_matrix), 0)

    if total_q_attempted == 0:
        mastery_status_label = "No Data Yet"
    elif overall_acc >= 85.0:
        mastery_status_label = "Mastery Achieved"
    elif overall_acc >= 75.0:
        mastery_status_label = "Strong Understanding"
    else:
        mastery_status_label = "Developing Understanding"

    mastery_progress = {
        "overall_mastery_pct": overall_acc,
        "status_label": mastery_status_label,
        "mastered_count": mastered_cnt,
        "review_needed_count": review_cnt,
        "advanced_remaining_count": advanced_rem
    }

    # 8. Real Analytics Summary Report
    learning_summary = {
        "overall_accuracy_pct": overall_acc,
        "learning_gain_text": f"+{delta}% Gain" if delta is not None else "N/A",
        "strongest_area": concept_mastery_matrix[-1]["concept"] if concept_mastery_matrix else "N/A",
        "focus_area": concept_mastery_matrix[0]["concept"] if concept_mastery_matrix else "N/A",
        "study_consistency": "High" if study_days_count >= 10 else "Moderate" if study_days_count >= 3 else "Low" if study_days_count > 0 else "None",
        "recommendation_text": f"Review {concept_mastery_matrix[0]['concept']} problem sets to boost overall mastery." if concept_mastery_matrix else "Complete your first quiz or assessment to generate tailored academic recommendations."
    }

    response_payload = {
        "data": {
            "topic_assessment_breakdown": topic_assessment_breakdown,
            "concept_mastery_matrix": concept_mastery_matrix,
            "weak_concepts": weak_concepts,
            "pre_post_delta": pre_post_delta,
            "accuracy_trend": accuracy_trend,
            "accuracy_trend_summary": accuracy_trend_summary,
            "heatmap_days": heatmap_days,
            "study_habit_analytics": study_habit_analytics,
            "personalized_insights": personalized_insights,
            "mastery_progress": mastery_progress,
            "learning_summary": learning_summary,
            "total_questions_attempted": total_q_attempted,
            "total_correct": total_q_correct,
            "overall_accuracy_pct": overall_acc,
            "total_assessments_completed": len(assessments),
            "current_streak": current_streak
        },
        "meta": None,
        "error": None
    }

    set_cached_analytics(cache_key, response_payload)
    return response_payload

@router.post("/demo/seed", summary="Seed realistic demo history for judge walkthrough")
async def trigger_demo_seed(
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")
    res = await seed_demo_user_history(db, firebase_uid)
    return {"data": res, "meta": None, "error": None}


class EmailReportRequest(BaseModel):
    email: Optional[str] = None


@router.post("/analytics/email-report", summary="Send official academic progress report to registered email")
async def email_analytics_report(
    payload: Optional[EmailReportRequest] = Body(None),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")
    
    # Resolve recipient email address:
    # 1. Payload email (if provided)
    # 2. Verified token email
    # 3. Registered email in MongoDB users collection
    user_email = (payload.email if payload and payload.email else None) or decoded_token.get("email")

    if not user_email:
        user_doc = await db.users.find_one({"firebase_uid": firebase_uid})
        if user_doc:
            user_email = user_doc.get("email")

    if not user_email or "@" not in user_email or user_email.endswith("@qrious.app"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid registered email address found for your account."
        )

    # Get analytics metrics for user
    dash_data = await get_analytics_dashboard(tz_offset=0, roadmap_id=None, decoded_token=decoded_token)
    data = dash_data.get("data", {})
    learning_summary = data.get("learning_summary", {})
    user_doc = await db.users.find_one({"firebase_uid": firebase_uid}) or {}
    display_name = user_doc.get("display_name") or decoded_token.get("name") or "Quantum Student"

    overall_acc = data.get("overall_accuracy_pct", 0)
    streak = data.get("current_streak", 0)
    strongest = learning_summary.get("strongest_area", "Linear Algebra Foundations")
    focus = learning_summary.get("focus_area", "Quantum Teleportation Protocols")
    rec = learning_summary.get("recommendation_text", "Continue reviewing core concept problem sets.")

    subject = f"Qrious Quantum Platform • Official Academic Progress Report for {display_name}"
    
    plain_body = f"""Dear {display_name},

Here is your official Academic Progress Report from the Qrious Quantum Learning Platform:

• Overall Mastery Accuracy: {overall_acc}%
• Active Learning Streak: {streak} Days
• Strongest Mastery Area: {strongest}
• Primary Focus Area: {focus}

Academic Recommendation:
{rec}

Keep exploring quantum computing and quantum communication topics on Qrious!

Best regards,
The Qrious Academic Team
"""

    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; color: #18181b;">
      <div style="background: #10b981; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; tracking-tight: -0.5px;">Qrious Quantum Platform</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Official Academic Learning Progress Report</p>
      </div>

      <div style="padding: 32px;">
        <p style="font-size: 16px; margin-top: 0;">Hello <strong>{display_name}</strong>,</p>
        <p style="font-size: 14px; color: #52525b; line-height: 1.6;">Below is your latest verified academic learning summary across Quantum Computing & Communication courses:</p>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Overall Accuracy:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #10b981; font-size: 18px;">{overall_acc}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Active Streak:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b;">{streak} Days</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Strongest Topic:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b;">{strongest}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a;">Focus Area:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #18181b;">{focus}</td>
            </tr>
          </table>
        </div>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #065f46;">Academic Recommendation</h4>
          <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">{rec}</p>
        </div>

        <p style="font-size: 13px; color: #71717a; text-align: center; margin-bottom: 0;">Report generated on {datetime.utcnow().strftime('%B %d, %Y')} • Qrious Academic Engine</p>
      </div>
    </div>
    """

    try:
        await send_email(to_email=user_email, subject=subject, body=plain_body, html_content=html_content)
    except Exception as e:
        print(f"[email_analytics_report] Error sending email: {e}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email to {user_email}: {str(e)}"
        )

    return {
        "data": {
            "message": f"Academic Progress Report successfully emailed to {user_email}",
            "to_email": user_email
        },
        "meta": None,
        "error": None
    }

