from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Any, List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel, Field

from database import get_db
from auth import get_verified_firebase_user

router = APIRouter(prefix="/api/v1/reviews", tags=["Spaced Repetition"])

def format_doc(doc: Any) -> Any:
    if isinstance(doc, dict):
        return {k: format_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [format_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    return doc

class MarkReviewPayload(BaseModel):
    target_id: str
    target_type: str # "roadmap" or "algorithm"
    title: str
    scheduled_date: str

class RateReviewPayload(BaseModel):
    rating: int = Field(ge=0, le=5) # 0 to 5 based on SM-2

@router.post("/mark", summary="Mark an item for review")
async def mark_for_review(
    payload: MarkReviewPayload,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    
    # Check if already exists
    existing = await db.spaced_reviews.find_one({
        "firebase_uid": firebase_uid,
        "target_id": payload.target_id,
        "target_type": payload.target_type
    })
    
    # Parse the scheduled_date
    try:
        scheduled_dt = datetime.fromisoformat(payload.scheduled_date)
        # If the user selected today (or earlier), make it due immediately
        if scheduled_dt <= datetime.utcnow() + timedelta(days=1):
            scheduled_dt = datetime.utcnow()
    except Exception:
        scheduled_dt = datetime.utcnow() + timedelta(days=1)

    if existing:
        # Update the existing review's next_review date
        await db.spaced_reviews.update_one(
            {"_id": existing["_id"]},
            {"$set": {"next_review": scheduled_dt, "updated_at": datetime.utcnow()}}
        )
        existing["next_review"] = scheduled_dt
        return {"data": format_doc(existing), "message": "Updated review date"}
        
    new_review = {
        "firebase_uid": firebase_uid,
        "target_id": payload.target_id,
        "target_type": payload.target_type,
        "title": payload.title,
        "next_review": scheduled_dt,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "email_sent": False # Track if we sent the reminder
    }
    
    result = await db.spaced_reviews.insert_one(new_review)
    new_review["_id"] = result.inserted_id
    
    return {"data": format_doc(new_review), "message": "Successfully marked for review"}

@router.get("/due", summary="Get items due for review")
async def get_due_reviews(
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    now = datetime.utcnow()
    
    cursor = db.spaced_reviews.find({
        "firebase_uid": firebase_uid,
        "next_review": {"$lte": now}
    }).sort("next_review", 1)
    
    due_items = await cursor.to_list(length=100)
    
    return {"data": [format_doc(item) for item in due_items]}

@router.get("", summary="Get all reviewed items")
async def get_all_reviews(
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    
    cursor = db.spaced_reviews.find({"firebase_uid": firebase_uid}).sort("next_review", 1)
    items = await cursor.to_list(length=1000)
    
    return {"data": [format_doc(item) for item in items]}

@router.post("/{review_id}/rate", summary="Rate a review and calculate next interval via SM-2")
async def rate_review(
    review_id: str,
    payload: RateReviewPayload,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    q = int(payload.rating)
    
    review_item = await db.spaced_reviews.find_one({
        "_id": ObjectId(review_id),
        "firebase_uid": firebase_uid
    })
    
    if not review_item:
        raise HTTPException(status_code=404, detail="Review item not found")
        
    efactor = review_item.get("efactor", 2.5)
    interval = review_item.get("interval", 0)
    repetitions = review_item.get("repetitions", 0)
    
    # SM-2 Algorithm Implementation
    if q >= 3:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * efactor)
        repetitions += 1
    else:
        repetitions = 0
        interval = 1
        
    # Update E-Factor
    efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if efactor < 1.3:
        efactor = 1.3
        
    next_review = datetime.utcnow() + timedelta(days=interval)
    
    update_data = {
        "efactor": efactor,
        "interval": interval,
        "repetitions": repetitions,
        "next_review": next_review,
        "updated_at": datetime.utcnow()
    }
    
    await db.spaced_reviews.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": update_data}
    )
    
    review_item.update(update_data)
    
    return {"data": format_doc(review_item), "message": "Rating recorded successfully"}
