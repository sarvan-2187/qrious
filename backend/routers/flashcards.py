from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import re

from database import get_db
from auth import get_verified_firebase_user
from firebase_admin import auth
from services.srs_engine import calculate_sm2
from services.xp_engine import xp_engine
from services.streak_engine import streak_engine
from services.badge_engine import badge_engine

router = APIRouter(prefix="/api/v1/learning/flashcards", tags=["Quantum Flashcards"])
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

def format_doc(doc: Any) -> Any:
    """Helper to convert BSON ObjectIds to strings recursively."""
    if isinstance(doc, dict):
        return {k: format_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [format_doc(v) for v in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

@router.get("", summary="Get flashcards by category, difficulty, or tags with optional SRS schedule")
@router.get("/", summary="Get flashcards by category, difficulty, or tags with optional SRS schedule")
async def get_flashcards(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    decoded_token: Optional[dict] = Depends(get_optional_firebase_user)
):
    db = get_db()
    query = {}
    
    if category:
        clean_cat = category.replace('-', ' ').strip()
        query["$or"] = [
            {"category": re.compile(rf"^{re.escape(category)}$", re.IGNORECASE)},
            {"category": re.compile(rf"^{re.escape(clean_cat)}$", re.IGNORECASE)},
            {"category": re.compile(rf"{re.escape(clean_cat)}", re.IGNORECASE)},
            {"tags": re.compile(rf"{re.escape(category)}", re.IGNORECASE)}
        ]
    if difficulty:
        query["difficulty"] = difficulty.lower()
        
    cards = []
    if db is not None:
        try:
            cursor = db.flashcards.find(query).limit(limit)
            cards = await cursor.to_list(length=limit)
            if not cards and category:
                # Fallback: fetch any general flashcards so deck is never empty
                cursor = db.flashcards.find({}).limit(limit)
                cards = await cursor.to_list(length=limit)
        except Exception as e:
            print(f"[Flashcards Router Warning] DB query failed: {e}")

    formatted_cards = [format_doc(card) for card in cards]
    return {
        "data": formatted_cards,
        "meta": {"count": len(formatted_cards)},
        "error": None
    }

@router.post("/{card_id}/review", summary="Review flashcard and update SM-2 repetition schedule")
async def review_flashcard(
    card_id: str,
    payload: Dict[str, Any],
    decoded_token: Optional[dict] = Depends(get_optional_firebase_user)
):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"

    # Flexible payload extraction for recall rating (1..5)
    rating = payload.get("recall_rating") or payload.get("quality") or payload.get("rating")
    if rating is None and "result" in payload:
        rating = 4 if payload["result"] == "remembered" else 1

    try:
        rating = int(rating) if rating is not None else 3
    except (ValueError, TypeError):
        rating = 3

    if rating not in [1, 2, 3, 4, 5]:
        rating = 3
        
    review_record = None
    if db is not None:
        try:
            review_record = await db.flashcard_reviews.find_one({"card_id": card_id, "firebase_uid": firebase_uid})
        except Exception:
            pass

    current_ef = review_record.get("ease_factor", 2.5) if review_record else 2.5
    current_interval = review_record.get("interval_days", 1) if review_record else 1
    current_reps = review_record.get("repetitions", 0) if review_record else 0
    
    new_ef, new_interval, new_reps = calculate_sm2(rating, current_ef, current_interval, current_reps)
    next_date = datetime.utcnow() + timedelta(days=new_interval)
    
    if db is not None:
        review_doc = {
            "firebase_uid": firebase_uid,
            "card_id": card_id,
            "ease_factor": new_ef,
            "interval_days": new_interval,
            "repetitions": new_reps,
            "last_reviewed_at": datetime.utcnow(),
            "next_review_date": next_date
        }
        try:
            await db.flashcard_reviews.update_one(
                {"card_id": card_id, "firebase_uid": firebase_uid},
                {"$set": review_doc},
                upsert=True
            )
        except Exception as e:
            print(f"[Flashcard Review Warning] DB update failed: {e}")
    
    # Award XP via XP engine (+5 XP per flashcard review)
    xp_amount = 5
    unique_ts = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
    xp_result = await xp_engine.award_xp(
        db=db,
        firebase_uid=firebase_uid,
        source="flashcard",
        amount=xp_amount,
        idempotent_key=f"review_{firebase_uid}_{card_id}_{unique_ts}"
    )

    actual_xp = xp_result.get("xp_awarded", xp_amount) if isinstance(xp_result, dict) else xp_amount

    # Record streak & check badges
    if db is not None:
        try:
            await streak_engine.record_daily_activity(db, firebase_uid)
            await badge_engine.check_and_award_badges(db, firebase_uid)
        except Exception:
            pass
    
    return {
        "data": {
            "success": True,
            "xp_awarded": actual_xp,
            "sm2": {
                "ease_factor": new_ef,
                "interval_days": new_interval,
                "repetitions": new_reps,
                "next_review_date": next_date.isoformat()
            }
        },
        "meta": None,
        "error": None
    }
