import os
from fastapi import APIRouter, Depends, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timezone
from livekit.api import TokenVerifier, WebhookReceiver
from database import get_db
from auth import get_current_user
from routers.educator import require_course_owner
from routers.default import require_course_access
from live_service import generate_room_token, start_recording, stop_recording, update_participant_permissions, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
from models.lms import LiveSessionCreate, LiveSessionOut, serialize
from pydantic import BaseModel

class PermissionUpdate(BaseModel):
    can_publish: bool
from storage_service import generate_download_url
from live_service import generate_room_token, start_recording, stop_recording, update_participant_permissions, update_all_participants_permissions, delete_livekit_room

# Verifies the Authorization header LiveKit signs every webhook request
# with, so a forged POST to this endpoint (anyone who finds the URL, since it
# previously trusted the JSON body outright per its own TODO) can no longer
# flip an arbitrary session's status to "recording_ready".
_webhook_receiver = WebhookReceiver(TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET))

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

@router.get("/live-sessions/notifications", summary="Live-now sessions across every course the student is enrolled in")
async def get_live_session_notifications(user=Depends(get_current_user)):
    """Polled by the frontend's NotificationBell (same poll-based pattern
    already used for spaced-repetition review reminders) so a student sees a
    'live now' alert regardless of which page they're on, not just when they
    happen to be looking at that specific course's page."""
    db = get_db()
    enrollments = await db.enrollments.find({"student_uid": user["firebase_uid"]}, {"course_id": 1}).to_list(length=None)
    course_ids = [e["course_id"] for e in enrollments]
    if not course_ids:
        return {"data": [], "meta": None, "error": None}

    sessions = await db.live_sessions.find(
        {"course_id": {"$in": course_ids}, "status": "live"}
    ).sort("started_at", -1).to_list(length=None)
    if not sessions:
        return {"data": [], "meta": None, "error": None}

    courses = await db.courses.find(
        {"_id": {"$in": [s["course_id"] for s in sessions]}}, {"title": 1}
    ).to_list(length=None)
    course_titles = {c["_id"]: c.get("title", "Course") for c in courses}

    return {
        "data": [
            {
                "_id": str(s["_id"]),
                "course_id": str(s["course_id"]),
                "course_title": course_titles.get(s["course_id"], "Course"),
                "title": s.get("title", "Live Session"),
                "started_at": s.get("started_at").isoformat() if s.get("started_at") else None,
            }
            for s in sessions
        ],
        "meta": None,
        "error": None,
    }

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
    
    # Try to start recording — gracefully skip if Egress is not configured on this LiveKit deployment.
    egress_id = None
    try:
        egress_id = await start_recording(session["room_name"], recording_key)
    except Exception as e:
        print(f"[WARNING] Could not start recording egress (session will still go live): {e}")

    update_fields: dict = {
        "status": "live",
        "started_at": datetime.now(timezone.utc),
    }
    if egress_id:
        update_fields["egress_id"] = egress_id
        update_fields["recording_b2_key"] = recording_key

    await db.live_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": update_fields}
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
        try:
            await stop_recording(session["egress_id"])
        except Exception as e:
            print(f"[WARNING] Could not stop recording egress: {e}")

    try:
        await delete_livekit_room(session["room_name"])
    except Exception as e:
        print(f"[WARNING] Could not delete LiveKit room: {e}")

    # If a recording was started, mark as processing; otherwise mark as simply ended.
    end_status = "recording_processing" if "egress_id" in session else "ended"
    await db.live_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": end_status, "ended_at": datetime.now(timezone.utc)}}
    )
    return {"status": "ended"}

@router.post("/live-sessions/{session_id}/participants/{identity}/permissions")
async def update_permissions(session_id: str, identity: str, data: PermissionUpdate, user=Depends(get_current_user)):
    db = get_db()
    session = await db.live_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        # Diagnostic-only: no code path deletes a live_sessions doc, so a 404
        # here on a session that just successfully accepted a join is
        # currently unexplained — this logs what's actually in Mongo at the
        # moment it happens instead of guessing blind. Safe to remove once
        # the real cause is confirmed from these logs.
        total = await db.live_sessions.count_documents({})
        live_ids = [str(s["_id"]) async for s in db.live_sessions.find({"status": "live"}, {"_id": 1})]
        print(f"[live_sessions 404] requested session_id={session_id!r} by uid={user.get('firebase_uid')} — "
              f"total live_sessions docs={total}, currently-live ids={live_ids}", flush=True)
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
        # See update_permissions above for why this is logged rather than
        # silently 404ing — same unexplained-so-far symptom.
        total = await db.live_sessions.count_documents({})
        live_ids = [str(s["_id"]) async for s in db.live_sessions.find({"status": "live"}, {"_id": 1})]
        print(f"[live_sessions 404] requested session_id={session_id!r} by uid={user.get('firebase_uid')} — "
              f"total live_sessions docs={total}, currently-live ids={live_ids}", flush=True)
        raise HTTPException(404, "Session not found")
        
    course = await db.courses.find_one({"_id": session["course_id"]})
    if course["owner_uid"] != user["firebase_uid"]:
        raise HTTPException(403, "Only the course owner can grant permissions")

    await update_all_participants_permissions(session["room_name"], data.can_publish, user["firebase_uid"])
    return {"status": "success"}

@router.post("/webhooks/livekit")
async def livekit_webhook(request: Request):
    raw_body = await request.body()
    auth_header = request.headers.get("Authorization", "")
    try:
        event = _webhook_receiver.receive(raw_body.decode("utf-8"), auth_header)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid webhook signature: {e}")

    if event.event == "egress_ended":
        egress_id = event.egress_info.egress_id if event.egress_info else None
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
