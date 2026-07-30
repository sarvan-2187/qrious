import os
import time
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from services.qbraid_service import qbraid_service
from services.qiskit_service import ensure_measurements

router = APIRouter(prefix="/api/v1/qbraid", tags=["qBraid Real Hardware"])

QBRAID_DAILY_JOB_LIMIT = int(os.getenv("QBRAID_DAILY_JOB_LIMIT", "5"))

# In-process cache for the device list — qBraid's device catalog barely
# changes, no reason to hit it on every page load. Not shared across
# multiple server processes/instances, which is fine: worst case each
# process independently re-fetches every 10 minutes.
_device_cache: dict = {"data": None, "fetched_at": 0.0}
_DEVICE_CACHE_TTL_SECONDS = 600


class QasmJobRequest(BaseModel):
    qasm: str
    device_id: str
    shots: int = 1024


def _serialize_job(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "device_id": doc["device_id"],
        "shots": doc["shots"],
        "status": doc["status"],
        "result": doc.get("result"),
        "cost": doc.get("cost"),
        "estimated_cost": doc.get("estimated_cost"),
        "error_message": doc.get("error_message"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


@router.get("/devices")
async def list_devices(current_user: dict = Depends(get_current_user)):
    now = time.monotonic()
    if _device_cache["data"] is not None and (now - _device_cache["fetched_at"]) < _DEVICE_CACHE_TTL_SECONDS:
        return _device_cache["data"]

    try:
        devices = qbraid_service.list_devices()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    _device_cache["data"] = devices
    _device_cache["fetched_at"] = now
    return devices


@router.post("/jobs")
async def submit_job(request: QasmJobRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_count = await db.quantum_hw_jobs.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": since},
    })
    if recent_count >= QBRAID_DAILY_JOB_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily real-hardware run limit reached ({QBRAID_DAILY_JOB_LIMIT}/day). Try again tomorrow.",
        )

    try:
        qasm = ensure_measurements(request.qasm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse this circuit's OpenQASM: {e}")

    try:
        qbraid_job_qrn = qbraid_service.submit_job(qasm, request.device_id, request.shots)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        # Already a clear, user-facing message (e.g. no funded credits for
        # this device) — pass it through as-is, no extra wrapping prefix.
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"qBraid job submission failed: {str(e)}")

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "device_id": request.device_id,
        "shots": request.shots,
        "qasm": qasm,  # normalized — see ensure_measurements()
        "qbraid_job_qrn": qbraid_job_qrn,
        "status": "queued",
        "result": None,
        "cost": None,
        "estimated_cost": None,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.quantum_hw_jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_job(doc)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.quantum_hw_jobs.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    user_id = current_user.get("_id") or current_user.get("firebase_uid")
    if doc["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only view your own jobs")

    if doc["status"] not in ("completed", "failed"):
        try:
            live = qbraid_service.get_job_result(doc["qbraid_job_qrn"])
            update = {
                "status": live["status"],
                "result": live["counts"],
                "cost": live["cost"],
                "estimated_cost": live["estimated_cost"],
                "error_message": live.get("error_message"),
                "updated_at": datetime.now(timezone.utc),
            }
            await db.quantum_hw_jobs.update_one({"_id": doc["_id"]}, {"$set": update})
            doc.update(update)
        except Exception as e:
            # Don't fail the whole status check just because this one poll
            # couldn't reach qBraid — return the last cached state instead.
            print(f"[qbraid_router] failed to refresh job {job_id}: {e}", flush=True)

    return _serialize_job(doc)


@router.get("/jobs")
async def list_my_jobs(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = current_user.get("_id") or current_user.get("firebase_uid")
    cursor = db.quantum_hw_jobs.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return [_serialize_job(d) for d in docs]
