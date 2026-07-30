from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
from datetime import datetime
from database import get_db
from auth import get_verified_firebase_user
from firebase_admin import auth
from services.xp_engine import xp_engine
from services.streak_engine import streak_engine
from services.badge_engine import badge_engine
from services.roadmap_seed import SEED_TOPICS

router = APIRouter(prefix="/api/v1/learning/roadmap", tags=["Quantum Roadmap"])
security_optional = HTTPBearer(auto_error=False)

async def get_optional_firebase_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)):
    if not credentials or not credentials.credentials:
        return None
    try:
        token = credentials.credentials
        decoded = auth.verify_id_token(token, check_revoked=False, clock_skew_seconds=10)
        return decoded
    except Exception:
        return None

def format_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to convert ObjectId to string in MongoDB documents."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

async def get_user_progress_map(db, firebase_uid: str) -> Dict[str, Dict[str, Any]]:
    """Helper to retrieve all user progress records as a dict keyed by topic_slug."""
    cursor = db.user_progress.find({"firebase_uid": firebase_uid})
    progress_records = await cursor.to_list(length=100)
    return {p["topic_slug"]: p for p in progress_records}

def resolve_topic_status(topic: Dict[str, Any], progress_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes status ('locked', 'unlocked', 'in_progress', 'completed') and progress_pct
    for a topic based on user progress and prerequisite completion.
    """
    topic_slug = topic["slug"]
    user_p = progress_map.get(topic_slug)
    
    if user_p:
        status_val = user_p.get("status", "unlocked")
        progress_pct = user_p.get("progress_pct", 100 if status_val == "completed" else 0)
    else:
        # Check prerequisites
        prereqs = topic.get("prerequisites", [])
        completed_slugs = {
            slug for slug, p in progress_map.items() if p.get("status") == "completed"
        }
        all_prereqs_met = all(prereq in completed_slugs for prereq in prereqs)
        
        if not prereqs or all_prereqs_met:
            status_val = "unlocked"
        else:
            status_val = "locked"
        progress_pct = 0
        
    topic_copy = format_doc(dict(topic))
    topic_copy["user_status"] = status_val
    topic_copy["progress_pct"] = progress_pct
    if user_p:
        topic_copy["started_at"] = user_p.get("started_at")
        topic_copy["completed_at"] = user_p.get("completed_at")
        topic_copy["total_time_spent_seconds"] = user_p.get("total_time_spent_seconds", 0)
    return topic_copy

@router.get("", summary="Get full quantum roadmap topic tree with user progress")
@router.get("/", summary="Get full quantum roadmap topic tree with user progress")
async def get_roadmap(domain: Optional[str] = None, decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    
    query = {}
    if domain and domain != "all":
        if domain == "quantum-computing":
            query = {"$or": [{"domain": "quantum-computing"}, {"domain": {"$exists": False}}, {"domain": None}]}
        else:
            query = {"domain": domain}

    raw_topics = []
    if db is not None:
        try:
            topics_cursor = db.roadmap_topics.find(query).sort("order_index", 1)
            raw_topics = await topics_cursor.to_list(length=100)
        except Exception as e:
            print(f"[Roadmap Router Warning] Failed to query roadmap_topics from DB: {e}")

    if not raw_topics:
        if domain == "quantum-computing":
            raw_topics = [t for t in SEED_TOPICS if t.get("domain", "quantum-computing") == "quantum-computing"]
        elif domain and domain != "all":
            raw_topics = [t for t in SEED_TOPICS if t.get("domain") == domain]
        else:
            raw_topics = SEED_TOPICS

    # Strict sorting by order_index (1 to N)
    raw_topics = sorted(raw_topics, key=lambda t: t.get("order_index", 99))

    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"
    progress_map = {}
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception as e:
            print(f"[Roadmap Router Warning] Failed to query user progress: {e}")
    
    merged_topics = [resolve_topic_status(topic, progress_map) for topic in raw_topics]
    
    return {
        "data": merged_topics,
        "meta": None,
        "error": None
    }

@router.get("/{slug}", summary="Get single roadmap topic detail with user status")
async def get_roadmap_topic(slug: str, decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    topic = None
    if db is not None:
        try:
            topic = await db.roadmap_topics.find_one({"slug": slug})
        except Exception:
            pass

    if not topic:
        topic = next((t for t in SEED_TOPICS if t["slug"] == slug), None)
        
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")
        
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"
    progress_map = {}
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception:
            pass
            
    merged_topic = resolve_topic_status(topic, progress_map)
    
    return {
        "data": merged_topic,
        "meta": None,
        "error": None
    }

@router.post("/{slug}/start", summary="Mark roadmap topic as started / in_progress")
async def start_roadmap_topic(slug: str, decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"
    
    topic = None
    if db is not None:
        try:
            topic = await db.roadmap_topics.find_one({"slug": slug})
        except Exception:
            pass

    if not topic:
        topic = next((t for t in SEED_TOPICS if t["slug"] == slug), None)

    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")
        
    progress_map = {}
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception:
            pass

    prereqs = topic.get("prerequisites", [])
    completed_slugs = {s for s, p in progress_map.items() if p.get("status") == "completed"}
    
    if prereqs and not all(p in completed_slugs for p in prereqs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prerequisites not met for topic '{slug}'"
        )
        
    now = datetime.utcnow()
    if db is not None:
        try:
            await db.user_progress.update_one(
                {"firebase_uid": firebase_uid, "topic_slug": slug},
                {
                    "$set": {
                        "status": "in_progress",
                        "progress_pct": 0,
                        "updated_at": now
                    },
                    "$setOnInsert": {
                        "started_at": now,
                        "created_at": now
                    }
                },
                upsert=True
            )
        except Exception as e:
            print(f"[Start Topic Warning] DB update failed: {e}")
    
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception:
            pass

    merged_topic = resolve_topic_status(topic, progress_map)
    
    return {
        "data": merged_topic,
        "meta": None,
        "error": None
    }

@router.post("/{slug}/progress", summary="Update time spent and percentage progress for a topic")
async def update_roadmap_topic_progress(
    slug: str,
    payload: Dict[str, Any],
    decoded_token: Optional[dict] = Depends(get_optional_firebase_user)
):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"

    time_spent = payload.get("time_spent_seconds", 0)
    progress_pct = payload.get("progress_pct", 0)

    try:
        time_spent = int(time_spent)
        progress_pct = min(100, max(0, int(progress_pct)))
    except (ValueError, TypeError):
        time_spent = 0
        progress_pct = 0

    topic = None
    if db is not None:
        try:
            topic = await db.roadmap_topics.find_one({"slug": slug})
        except Exception:
            pass

    if not topic:
        topic = next((t for t in SEED_TOPICS if t["slug"] == slug), None)

    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")

    now = datetime.utcnow()
    existing = None
    if db is not None:
        try:
            existing = await db.user_progress.find_one({"firebase_uid": firebase_uid, "topic_slug": slug})
        except Exception:
            pass

    prev_pct = existing.get("progress_pct", 0) if existing else 0
    new_pct = max(prev_pct, progress_pct)
    is_completed = new_pct >= 100 or (existing and existing.get("status") == "completed")
    new_status = "completed" if is_completed else "in_progress"

    if db is not None:
        update_fields = {
            "status": new_status,
            "progress_pct": new_pct,
            "updated_at": now
        }
        if is_completed and (not existing or existing.get("status") != "completed"):
            update_fields["completed_at"] = now

        try:
            await db.user_progress.update_one(
                {"firebase_uid": firebase_uid, "topic_slug": slug},
                {
                    "$set": update_fields,
                    "$inc": {"total_time_spent_seconds": time_spent},
                    "$setOnInsert": {
                        "started_at": now,
                        "created_at": now
                    }
                },
                upsert=True
            )
        except Exception as e:
            print(f"[Roadmap Progress Warning] DB update failed: {e}")

    # If first time reaching 100% completion, award XP
    is_first_completion = is_completed and (not existing or existing.get("status") != "completed")
    if is_first_completion and db is not None:
        try:
            await xp_engine.award_xp(
                db=db,
                firebase_uid=firebase_uid,
                source="roadmap",
                amount=50,
                source_ref_id=slug,
                idempotent_key=f"roadmap_{firebase_uid}_{slug}"
            )
            await streak_engine.record_daily_activity(db, firebase_uid)
        except Exception as e:
            print(f"[Roadmap Award XP Warning] {e}")

    progress_map = {}
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception:
            pass

    merged_topic = resolve_topic_status(topic, progress_map)

    return {
        "data": {
            "topic": merged_topic,
            "progress_pct": new_pct,
            "time_spent_seconds": time_spent,
            "xp_awarded": 50 if is_first_completion else 0
        },
        "meta": None,
        "error": None
    }

@router.post("/{slug}/complete", summary="Mark roadmap topic as completed and award XP")
async def complete_roadmap_topic(slug: str, decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"
    
    topic = None
    if db is not None:
        try:
            topic = await db.roadmap_topics.find_one({"slug": slug})
        except Exception:
            pass

    if not topic:
        topic = next((t for t in SEED_TOPICS if t["slug"] == slug), None)

    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")
        
    existing = None
    if db is not None:
        try:
            existing = await db.user_progress.find_one({"firebase_uid": firebase_uid, "topic_slug": slug})
        except Exception:
            pass

    is_first_completion = not existing or existing.get("status") != "completed"
    
    now = datetime.utcnow()
    if db is not None:
        try:
            await db.user_progress.update_one(
                {"firebase_uid": firebase_uid, "topic_slug": slug},
                {
                    "$set": {
                        "status": "completed",
                        "progress_pct": 100,
                        "completed_at": now,
                        "updated_at": now
                    },
                    "$setOnInsert": {
                        "started_at": now,
                        "created_at": now
                    }
                },
                upsert=True
            )
        except Exception as e:
            print(f"[Complete Topic Warning] DB update failed: {e}")
    
    xp_result = None
    streak_result = None
    new_badges = []
    
    if is_first_completion and db is not None:
        try:
            xp_result = await xp_engine.award_xp(
                db=db,
                firebase_uid=firebase_uid,
                source="roadmap",
                amount=50,
                source_ref_id=slug,
                idempotent_key=f"roadmap_{firebase_uid}_{slug}"
            )
            
            streak_result = await streak_engine.record_daily_activity(
                db=db,
                firebase_uid=firebase_uid
            )
            
            new_badges = await badge_engine.eval_and_award_badges(db, firebase_uid)
        except Exception as e:
            print(f"[Badge Evaluation Warning] {e}")
            
    progress_map = {}
    if db is not None:
        try:
            progress_map = await get_user_progress_map(db, firebase_uid)
        except Exception:
            pass

    merged_topic = resolve_topic_status(topic, progress_map)
    
    return {
        "data": {
            "topic": merged_topic,
            "xp_awarded": 50 if is_first_completion else 0,
            "first_time_completed": is_first_completion,
            "xp_summary": xp_result,
            "streak_summary": streak_result,
            "newly_unlocked_badges": new_badges
        },
        "meta": None,
        "error": None
    }
