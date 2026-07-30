from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from database import get_db
from auth import get_verified_firebase_user
from services.badge_engine import badge_engine

router = APIRouter(prefix="/api/v1/learning/badges", tags=["Quantum Badges"])

def format_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("", summary="Get all badges catalog with user unlock status")
@router.get("/", summary="Get all badges catalog with user unlock status")
async def get_badges_catalog(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")

    # Get all catalog badges
    cursor = db.badges.find()
    catalog_badges = await cursor.to_list(length=100)

    # Get user unlocked records
    unlocked_cursor = db.user_badges.find({"firebase_uid": firebase_uid})
    unlocked_records = await unlocked_cursor.to_list(length=100)
    unlocked_map = {
        (r.get("badge_id") or r.get("badge_slug")): r.get("unlocked_at") 
        for r in unlocked_records 
        if r.get("badge_id") or r.get("badge_slug")
    }

    result = []
    for b in catalog_badges:
        b_formatted = format_doc(dict(b))
        b_id = b_formatted["badge_id"]
        b_formatted["is_unlocked"] = b_id in unlocked_map
        if b_id in unlocked_map:
            dt = unlocked_map[b_id]
            b_formatted["unlocked_at"] = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        else:
            b_formatted["unlocked_at"] = None
        result.append(b_formatted)

    return {
        "data": result,
        "meta": {"total": len(result), "unlocked_count": len(unlocked_map)},
        "error": None
    }

@router.get("/unlocked", summary="Get user's unlocked badges")
async def get_unlocked_badges(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")
    unlocked_cursor = db.user_badges.find({"firebase_uid": firebase_uid})
    unlocked_records = await unlocked_cursor.to_list(length=100)
    unlocked_ids = {
        (r.get("badge_id") or r.get("badge_slug")): r.get("unlocked_at") 
        for r in unlocked_records 
        if r.get("badge_id") or r.get("badge_slug")
    }

    badges_cursor = db.badges.find({"badge_id": {"$in": list(unlocked_ids.keys())}})
    badges = await badges_cursor.to_list(length=100)

    result = []
    for b in badges:
        b_formatted = format_doc(dict(b))
        b_id = b_formatted["badge_id"]
        b_formatted["is_unlocked"] = True
        dt = unlocked_ids.get(b_id)
        b_formatted["unlocked_at"] = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        result.append(b_formatted)

    return {
        "data": result,
        "meta": {"total": len(result)},
        "error": None
    }

@router.post("/check", summary="Check and unlock eligible badges for user")
async def check_badges(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    firebase_uid = decoded_token.get("uid")
    newly_unlocked = await badge_engine.check_and_award_badges(db, firebase_uid)

    return {
        "data": newly_unlocked,
        "meta": {"new_unlocks_count": len(newly_unlocked)},
        "error": None
    }
