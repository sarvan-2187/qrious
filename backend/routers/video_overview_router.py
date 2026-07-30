import os
from datetime import datetime, timezone

import httpx
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from auth import get_current_user
from database import get_db
from models.video_overview import VideoOverviewCreate
from routers.educator import require_lesson_owner, require_course_owner
from storage_service import generate_download_url

router = APIRouter(prefix="/api", tags=["Video Overview"])

QSTUDIO_SERVICE_URL = os.getenv("QSTUDIO_SERVICE_URL")
QSTUDIO_SERVICE_SECRET = os.getenv("QSTUDIO_SERVICE_SECRET")


def _serialize_video_overview(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "lesson_id": str(doc["lesson_id"]) if doc.get("lesson_id") else None,
        "prompt": doc["prompt"],
        "status": doc["status"],
        "error": doc.get("error"),
        "resource_id": str(doc["resource_id"]) if doc.get("resource_id") else None,
        "slide_script": doc.get("slide_script"),
        "template": doc.get("template", "minimal_dark"),
        "voice": doc.get("voice", "female"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def _trigger_qstudio_service(video_overview_id: str):
    if not QSTUDIO_SERVICE_URL or not QSTUDIO_SERVICE_SECRET:
        print(f"[video_overview {video_overview_id}] QSTUDIO_SERVICE_URL/QSTUDIO_SERVICE_SECRET not configured; job left queued", flush=True)
        return
    print(f"[video_overview {video_overview_id}] triggering qstudio_service at {QSTUDIO_SERVICE_URL}", flush=True)
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            response = await client.post(
                f"{QSTUDIO_SERVICE_URL}/internal/video-overview",
                json={"video_overview_id": video_overview_id},
                headers={"X-Internal-Secret": QSTUDIO_SERVICE_SECRET},
            )
            print(f"[video_overview {video_overview_id}] qstudio_service responded with status {response.status_code}", flush=True)
        except httpx.HTTPError as e:
            print(f"[video_overview {video_overview_id}] failed to trigger qstudio_service: {e}", flush=True)


async def _resolve_course_id_from_video_overview(video_overview_id: str) -> tuple[dict, str]:
    db = get_db()
    doc = await db.video_overviews.find_one({"_id": ObjectId(video_overview_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Video overview not found")
    lesson = await db.lessons.find_one({"_id": doc["lesson_id"]})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    module = await db.modules.find_one({"_id": lesson["module_id"]})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return doc, str(module["course_id"])


@router.post("/lessons/{lesson_id}/video-overviews")
async def create_video_overview(
    lesson_id: str,
    data: VideoOverviewCreate,
    background_tasks: BackgroundTasks,
    course=Depends(require_lesson_owner),
    user=Depends(get_current_user),
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    if data.source_resource_id:
        source = await db.resources.find_one({
            "_id": ObjectId(data.source_resource_id),
            "lesson_id": ObjectId(lesson_id),
            "status": "confirmed",
        })
        if not source:
            raise HTTPException(status_code=404, detail="Source resource not found on this lesson")

    now = datetime.now(timezone.utc)
    doc = {
        "lesson_id": ObjectId(lesson_id),
        "requested_by": user["firebase_uid"],
        "prompt": data.prompt,
        "source_resource_id": ObjectId(data.source_resource_id) if data.source_resource_id else None,
        "template": data.template,
        "voice": data.voice,
        "status": "queued",
        "error": None,
        "slide_script": None,
        "resource_id": None,
        "b2_key": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.video_overviews.insert_one(doc)
    video_overview_id = str(result.inserted_id)

    # Notify the render service after the response is sent, and return to the frontend
    # immediately — this endpoint doesn't wait for or read the render service's own HTTP
    # response (sent only once rendering finishes, minutes later); MongoDB is the shared
    # state the frontend polls via GET below.
    #
    # Uses FastAPI's BackgroundTasks, not a bare asyncio.create_task(...): a detached task
    # scheduled right before `return` is only "scheduled," not guaranteed to actually run —
    # if the ASGI process moves on or recycles before the event loop gets around to it, the
    # task silently vanishes. This is exactly what happened in production: every job stayed
    # at status="queued" forever with zero log trace of the render service ever being
    # called. BackgroundTasks is Starlette's own mechanism for "run this after the response
    # is sent" and is guaranteed to execute before the connection is torn down.
    background_tasks.add_task(_trigger_qstudio_service, video_overview_id)

    return {"video_overview_id": video_overview_id}


@router.post("/video-overviews")
async def create_standalone_video_overview(
    data: VideoOverviewCreate,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    """Student-facing entry point (the dashboard's chat-style tab): not tied to any
    course/lesson, so it skips require_lesson_owner entirely — any authenticated user
    (student or educator) can use it. Grounding on an existing lesson PDF isn't
    available here since there's no lesson in scope, so source_resource_id is ignored."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    now = datetime.now(timezone.utc)
    doc = {
        "lesson_id": None,
        "requested_by": user["firebase_uid"],
        "prompt": data.prompt,
        "source_resource_id": None,
        "template": data.template,
        "voice": data.voice,
        "status": "queued",
        "error": None,
        "slide_script": None,
        "resource_id": None,
        "b2_key": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.video_overviews.insert_one(doc)
    video_overview_id = str(result.inserted_id)
    background_tasks.add_task(_trigger_qstudio_service, video_overview_id)

    return {"video_overview_id": video_overview_id}


@router.get("/video-overviews")
async def list_my_video_overviews(user=Depends(get_current_user)):
    """Chat history for the standalone generator — only the requester's own
    non-lesson-scoped jobs, newest first."""
    db = get_db()
    cursor = db.video_overviews.find({
        "lesson_id": None,
        "requested_by": user["firebase_uid"],
    }).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return [_serialize_video_overview(d) for d in docs]


@router.get("/video-overviews/{video_overview_id}")
async def get_video_overview_status(video_overview_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = await db.video_overviews.find_one({"_id": ObjectId(video_overview_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Video overview not found")

    if doc.get("lesson_id") is None:
        if doc["requested_by"] != user["firebase_uid"]:
            raise HTTPException(status_code=403, detail="You can only view your own video overviews")
    else:
        _, course_id = await _resolve_course_id_from_video_overview(video_overview_id)
        await require_course_owner(course_id, user=user)

    return _serialize_video_overview(doc)


@router.get("/video-overviews/{video_overview_id}/view-url")
async def get_video_overview_view_url(video_overview_id: str, user=Depends(get_current_user)):
    """Standalone playback URL: the resulting video isn't attached to a lesson's
    `resources` collection (there's no lesson to attach it to), so it can't be played
    through the shared /api/resources/{id}/view-url endpoint — this reads the B2 key
    straight off the video_overviews doc instead."""
    db = get_db()
    doc = await db.video_overviews.find_one({"_id": ObjectId(video_overview_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Video overview not found")
    if doc["requested_by"] != user["firebase_uid"]:
        raise HTTPException(status_code=403, detail="You can only view your own video overviews")
    if doc["status"] != "ready" or not doc.get("b2_key"):
        raise HTTPException(status_code=409, detail="Video is not ready yet")

    VIDEO_URL_TTL_SECONDS = 6 * 60 * 60
    url = generate_download_url(doc["b2_key"], expires_in=VIDEO_URL_TTL_SECONDS)
    return {"view_url": url}


@router.get("/lessons/{lesson_id}/video-overviews")
async def list_video_overviews(lesson_id: str, course=Depends(require_lesson_owner)):
    db = get_db()
    cursor = db.video_overviews.find({"lesson_id": ObjectId(lesson_id)}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return [_serialize_video_overview(d) for d in docs]
