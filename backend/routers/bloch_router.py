from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from database import get_db
from auth import get_verified_firebase_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/v1/bloch", tags=["Bloch Sphere"])

class BlochProgressUpdate(BaseModel):
    completed_tasks: List[int]

@router.get("/progress", summary="Get user's 3D Bloch sphere task progress")
async def get_bloch_progress(decoded_token: dict = Depends(get_verified_firebase_user)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    
    progress_doc = await db.bloch_progress.find_one({"firebase_uid": firebase_uid})
    if not progress_doc:
        return {
            "data": {
                "firebase_uid": firebase_uid,
                "completed_tasks": []
            },
            "error": None
        }
        
    return {
        "data": {
            "firebase_uid": firebase_uid,
            "completed_tasks": progress_doc.get("completed_tasks", [])
        },
        "error": None
    }

@router.post("/progress", summary="Save user's 3D Bloch sphere task progress")
async def save_bloch_progress(
    progress_input: BlochProgressUpdate,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    firebase_uid = decoded_token.get("uid")
    
    # Calculate newly completed tasks to award XP
    existing_progress = await db.bloch_progress.find_one({"firebase_uid": firebase_uid})
    existing_completed = set(existing_progress.get("completed_tasks", [])) if existing_progress else set()
    
    newly_completed = set(progress_input.completed_tasks) - existing_completed
    
    # Award XP for each newly completed task
    from services.xp_engine import xp_engine
    for task_id in newly_completed:
        idempotent_key = f"bloch_task_{firebase_uid}_{task_id}"
        await xp_engine.award_xp(
            db=db,
            firebase_uid=firebase_uid,
            source="bloch_task",
            amount=10,  # 10 XP per Bloch task
            source_ref_id=str(task_id),
            idempotent_key=idempotent_key
        )
    
    now = datetime.utcnow()
    await db.bloch_progress.update_one(
        {"firebase_uid": firebase_uid},
        {
            "$set": {
                "completed_tasks": progress_input.completed_tasks,
                "updated_at": now
            }
        },
        upsert=True
    )
    
    return {
        "data": {
            "firebase_uid": firebase_uid,
            "completed_tasks": progress_input.completed_tasks
        },
        "error": None
    }
