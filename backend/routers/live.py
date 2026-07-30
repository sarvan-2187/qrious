import os
from fastapi import APIRouter, Depends, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone
from database import get_db
from auth import get_current_user
from routers.educator import require_course_owner
from routers.default import require_course_access
from live_service import generate_room_token, start_recording, stop_recording, update_participant_permissions
from models.lms import LiveSessionCreate, LiveSessionOut, serialize
from pydantic import BaseModel

class PermissionUpdate(BaseModel):
    can_publish: bool
from storage_service import generate_download_url
from live_service import generate_room_token, start_recording, stop_recording, update_participant_permissions, update_all_participants_permissions, delete_livekit_room

router = APIRouter(prefix="/api", tags=["Live Sessions"])

@router.post("/courses/{course_id}/live-sessions", response_model=LiveSessionOut)
async def create_live_session(course_id: str, data: LiveSessionCreate, course=Depends(require_course_owner)):
    db = get_db()
    session_doc = {
        "course_id": ObjectId(course_id),
        "title": data.title,
        "scheduled_at": data.scheduled_at,
        "status": "scheduled",
        "room_name": f"course-{course_id}-{ObjectId()}",
        "created_by": course["owner_uid"],
    }
    result = await db.live_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    return serialize(session_doc, LiveSessionOut)

@router.get("/courses/{course_id}/live-sessions", response_model=list[LiveSessionOut])
async def list_live_sessions(course_id: str, user=Depends(get_current_user)):
    db = get_db()
    await require_course_access(course_id, user)
    sessions = await db.live_sessions.find({"course_id": ObjectId(course_id)}).sort("scheduled_at", -1).to_list(length=None)
    return [serialize(s, LiveSessionOut) for s in sessions]

@router.post("/live-sessions/{session_id}/start")
async def start_session(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Session not found")
        
    course = await db.courses.find_one({"_id": session["course_id"]})
    if course["owner_uid"] != user["firebase_uid"]:
        raise HTTPException(403, "Only the course owner can start this session")

    recording_key = f"live-recordings/{session['course_id']}/{session_id}.mp4"
    egress_id = await start_recording(session["room_name"], recording_key)

    await db.live_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "live", "started_at": datetime.now(timezone.utc), "egress_id": egress_id, "recording_b2_key": recording_key}}
    )
    token = generate_room_token(session["room_name"], user["firebase_uid"], user.get("full_name", "Educator"), is_educator=True)
    return {"livekit_url": os.getenv("LIVEKIT_URL"), "token": token, "is_educator": True}

@router.post("/live-sessions/{session_id}/join")
async def join_session(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session or session["status"] != "live":
        raise HTTPException(400, "This session is not currently live")
    course_id = str(session["course_id"])
    await require_course_access(course_id, user)  # enrolled or owner only

    is_owner = session["created_by"] == user["firebase_uid"]
    token = generate_room_token(session["room_name"], user["firebase_uid"], user.get("full_name", "Student"), is_educator=is_owner)
    return {"livekit_url": os.getenv("LIVEKIT_URL"), "token": token, "is_educator": is_owner}

@router.post("/live-sessions/{session_id}/end")
async def end_session(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Session not found")
        
    course = await db.courses.find_one({"_id": session["course_id"]})
    if course["owner_uid"] != user["firebase_uid"]:
        raise HTTPException(403, "Only the course owner can end this session")

    if "egress_id" in session:
        await stop_recording(session["egress_id"])
        
    await delete_livekit_room(session["room_name"])
        
    await db.live_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "recording_processing", "ended_at": datetime.now(timezone.utc)}}
    )
    return {"status": "ended"}

@router.post("/live-sessions/{session_id}/participants/{identity}/permissions")
async def update_permissions(session_id: str, identity: str, data: PermissionUpdate, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Session not found")
        
    course = await db.courses.find_one({"_id": session["course_id"]})
    if course["owner_uid"] != user["firebase_uid"]:
        raise HTTPException(403, "Only the course owner can grant permissions")

    await update_participant_permissions(session["room_name"], identity, data.can_publish)
    return {"status": "success"}

@router.post("/live-sessions/{session_id}/permissions/all")
async def update_all_permissions(session_id: str, data: PermissionUpdate, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(404, "Session not found")
        
    course = await db.courses.find_one({"_id": session["course_id"]})
    if course["owner_uid"] != user["firebase_uid"]:
        raise HTTPException(403, "Only the course owner can grant permissions")

    await update_all_participants_permissions(session["room_name"], data.can_publish, user["firebase_uid"])
    return {"status": "success"}

@router.post("/webhooks/livekit")
async def livekit_webhook(request: Request):
    # TODO: Verify webhook signature per LiveKit's webhook auth docs before trusting payload
    body = await request.json()
    if body.get("event") == "egress_ended":
        egress_id = body.get("egressInfo", {}).get("egressId")
        if egress_id:
            db = get_db()
            await db.live_sessions.update_one(
                {"egress_id": egress_id},
                {"$set": {"status": "recording_ready"}}
            )
    return {"received": True}

@router.get("/live-sessions/{session_id}/download-url")
async def get_live_session_download_url(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
        
    course_id = str(session["course_id"])
    await require_course_access(course_id, user)
    
    if session.get("status") != "recording_ready" or not session.get("recording_b2_key"):
        raise HTTPException(status_code=400, detail="Recording is not ready")
        
    VIDEO_URL_TTL_SECONDS = 6 * 60 * 60  # 6 hours
    url = generate_download_url(session["recording_b2_key"], expires_in=VIDEO_URL_TTL_SECONDS)
    return {"download_url": url}
