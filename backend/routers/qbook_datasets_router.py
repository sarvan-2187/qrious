import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from auth import get_current_user
from database import get_db
from models.lms import serialize
from models.qbook_dataset import (
    DatasetDownloadUrlResponse,
    DatasetOut,
    DatasetUploadRequest,
    DatasetUploadUrlResponse,
)
from storage_service import (
    delete_dataset_object,
    generate_dataset_download_url,
    generate_dataset_upload_url,
)

router = APIRouter(prefix="/api/v1/qbook/datasets", tags=["qBook Datasets"])

# Matches notebook_service/kernel_manager.py's QBOOK_DATASET_MAX_BYTES default —
# this check is a UX guard (client-declared size_bytes, not measured), the real
# enforcement is on the WebSocket relay path when the file is actually written to
# the kernel's disk. See PLANS/qbook-qml.md §6.2.
DATASET_MAX_BYTES = 10 * 1024 * 1024


async def _get_owned_dataset(db, dataset_id: str, uid: str) -> dict:
    if not ObjectId.is_valid(dataset_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    doc = await db.qbook_datasets.find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if doc["owner_uid"] != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your dataset")
    return doc


@router.post("/upload-url", response_model=DatasetUploadUrlResponse)
async def get_upload_url(request: DatasetUploadRequest, current_user: dict = Depends(get_current_user)):
    if not request.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")
    if request.size_bytes > DATASET_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the {DATASET_MAX_BYTES // (1024 * 1024)}MB limit.",
        )

    db = get_db()
    uid = current_user["firebase_uid"]
    safe_filename = request.filename.replace(" ", "_")
    key = f"{uid}/{uuid.uuid4()}_{safe_filename}"

    doc = {
        "owner_uid": uid,
        "filename": safe_filename,
        "b2_key": key,
        "content_type": request.content_type,
        "size_bytes": request.size_bytes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.qbook_datasets.insert_one(doc)

    url = generate_dataset_upload_url(key, request.content_type)
    return DatasetUploadUrlResponse(upload_url=url, dataset_id=str(result.inserted_id))


@router.post("/{dataset_id}/confirm")
async def confirm_upload(dataset_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_dataset(db, dataset_id, current_user["firebase_uid"])
    await db.qbook_datasets.update_one({"_id": doc["_id"]}, {"$set": {"status": "confirmed"}})
    return {"message": "Dataset upload confirmed"}


@router.get("", response_model=list[DatasetOut])
async def list_datasets(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.qbook_datasets.find(
        {"owner_uid": current_user["firebase_uid"], "status": "confirmed"}
    ).sort("created_at", -1)
    return [serialize(doc, DatasetOut) async for doc in cursor]


@router.get("/{dataset_id}/download-url", response_model=DatasetDownloadUrlResponse)
async def get_download_url(dataset_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_dataset(db, dataset_id, current_user["firebase_uid"])
    url = generate_dataset_download_url(doc["b2_key"])
    return DatasetDownloadUrlResponse(download_url=url, filename=doc["filename"])


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(dataset_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_dataset(db, dataset_id, current_user["firebase_uid"])
    delete_dataset_object(doc["b2_key"])
    await db.qbook_datasets.delete_one({"_id": doc["_id"]})
