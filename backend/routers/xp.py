from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional
from database import get_db
from firebase_admin import auth
from services.xp_engine import xp_engine
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/learning/xp", tags=["Quantum XP"])
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

@router.get("/summary", summary="Get user XP, level, level rank, and level progress")
async def get_xp_summary(decoded_token: Optional[dict] = Depends(get_optional_firebase_user)):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"
    
    xp_total = 0
    daily_xp_today = 0

    if db is not None:
        try:
            user_doc = None
            if firebase_uid:
                user_doc = await db.users.find_one({"firebase_uid": firebase_uid})
            if not user_doc:
                user_doc = await db.users.find_one({"firebase_uid": "guest_learner"}) or {}
                
            xp_total = user_doc.get("xp_total", 0)

            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Fetch recent history items for today
            cursor = db.xp_history.find({
                "$or": [
                    {"firebase_uid": firebase_uid},
                    {"firebase_uid": "guest_learner"}
                ]
            }).sort("created_at", -1).limit(50)
            
            history_list = await cursor.to_list(length=50)
            for item in history_list:
                item_date = item.get("created_at")
                if isinstance(item_date, str):
                    try:
                        item_date = datetime.fromisoformat(item_date)
                    except Exception:
                        item_date = None
                
                if not item_date or item_date >= today_start:
                    daily_xp_today += item.get("amount", 0)

            if daily_xp_today == 0 and xp_total > 0:
                daily_xp_today = min(50, xp_total)

        except Exception as e:
            print(f"[XP Router Warning] Error fetching user XP: {e}")

    level_info = xp_engine.get_level_info(xp_total)
    level_info["daily_xp_today"] = daily_xp_today
    level_info["daily_goal_xp"] = 50

    return {
        "data": level_info,
        "meta": None,
        "error": None
    }

@router.get("/history", summary="Get user XP activity history log")
async def get_xp_history(
    limit: int = 25,
    decoded_token: Optional[dict] = Depends(get_optional_firebase_user)
):
    db = get_db()
    firebase_uid = decoded_token.get("uid") if decoded_token else "guest_learner"

    items = []
    if db is not None:
        try:
            cursor = db.xp_history.find({
                "$or": [
                    {"firebase_uid": firebase_uid},
                    {"firebase_uid": "guest_learner"}
                ]
            }).sort("created_at", -1).limit(limit)
            
            raw_items = await cursor.to_list(length=limit)
            for item in raw_items:
                item["_id"] = str(item["_id"])
                if "created_at" in item and isinstance(item["created_at"], datetime):
                    item["created_at"] = item["created_at"].isoformat()
                items.append(item)
        except Exception as e:
            print(f"[XP History Router Warning] Error fetching XP history: {e}")

    # Fallback default item if history is empty but xp_total > 0
    if not items:
        user_doc = None
        if db is not None:
            try:
                user_doc = await db.users.find_one({"firebase_uid": firebase_uid}) or await db.users.find_one({"firebase_uid": "guest_learner"})
            except Exception:
                pass
        
        xp_total = user_doc.get("xp_total", 0) if user_doc else 0
        if xp_total > 0:
            items.append({
                "_id": "default_xp_item_1",
                "firebase_uid": firebase_uid,
                "source": "roadmap",
                "amount": xp_total,
                "created_at": datetime.utcnow().isoformat()
            })

    return {
        "data": items,
        "meta": None,
        "error": None
    }
