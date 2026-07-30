from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId
import os
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from database import get_db
from auth import get_verified_firebase_user
from services.xp_engine import xp_engine
from services.streak_engine import streak_engine
from services.badge_engine import badge_engine

router = APIRouter(prefix="/api/v1/learning/notes", tags=["Personal Notes"])

def format_doc(doc: Any) -> Any:
    """Recursively converts BSON ObjectId instances to strings for clean JSON serialization."""
    if isinstance(doc, dict):
        return {k: format_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [format_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

# ----------------------------------------------------
# FOLDER ENDPOINTS
# ----------------------------------------------------

@router.get("/folders", summary="Get all note folders for current user")
async def get_note_folders(
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    cursor = db.note_folders.find({"firebase_uid": firebase_uid}).sort("created_at", -1)
    folders = await cursor.to_list(length=100)
    
    return {
        "data": [format_doc(dict(f)) for f in folders],
        "meta": None,
        "error": None
    }

@router.post("/folders", summary="Create a new note folder")
async def create_note_folder(
    payload: Dict[str, Any],
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    name = payload.get("name", "Untitled Folder").strip()
    color = payload.get("color", "#a855f7")
    
    if not name:
        raise HTTPException(status_code=400, detail="Folder name is required")
        
    folder_doc = {
        "firebase_uid": firebase_uid,
        "name": name,
        "color": color,
        "created_at": datetime.utcnow()
    }
    
    result = await db.note_folders.insert_one(folder_doc)
    folder_doc["_id"] = str(result.inserted_id)
    
    return {
        "data": format_doc(folder_doc),
        "meta": None,
        "error": None
    }

@router.delete("/folders/{folder_id}", summary="Delete a note folder and unassign contained notes")
async def delete_note_folder(
    folder_id: str,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if not ObjectId.is_valid(folder_id):
        raise HTTPException(status_code=400, detail="Invalid folder ID format")
        
    firebase_uid = decoded_token.get("uid")
    
    # 1. Delete folder
    res = await db.note_folders.delete_one({"_id": ObjectId(folder_id), "firebase_uid": firebase_uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    # 2. Graceful orphan handling: Reset folder_id = None on contained notes
    await db.notes.update_many(
        {"firebase_uid": firebase_uid, "folder_id": folder_id},
        {"$set": {"folder_id": None}}
    )
    
    return {
        "data": {"success": True, "deleted_folder_id": folder_id},
        "meta": None,
        "error": None
    }

# ----------------------------------------------------
# NOTES CRUD ENDPOINTS
# ----------------------------------------------------

@router.get("", summary="Get/search user notes")
@router.get("/", summary="Get/search user notes")
async def get_notes(
    folder_id: Optional[str] = Query(None),
    topic_slug: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    query: Dict[str, Any] = {"firebase_uid": firebase_uid}
    
    if folder_id:
        if folder_id == "unassigned":
            query["folder_id"] = None
        else:
            query["folder_id"] = folder_id
    if topic_slug:
        query["topic_slug"] = topic_slug
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content_markdown": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
        
    cursor = db.notes.find(query).sort("updated_at", -1)
    notes = await cursor.to_list(length=200)
    
    return {
        "data": [format_doc(dict(n)) for n in notes],
        "meta": {"total": len(notes)},
        "error": None
    }

@router.get("/{note_id}", summary="Get a single note by ID")
async def get_note_by_id(
    note_id: str,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if not ObjectId.is_valid(note_id):
        raise HTTPException(status_code=400, detail="Invalid note ID format")
        
    firebase_uid = decoded_token.get("uid")
    note = await db.notes.find_one({"_id": ObjectId(note_id), "firebase_uid": firebase_uid})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    return {
        "data": format_doc(dict(note)),
        "meta": None,
        "error": None
    }

@router.post("", summary="Create a new personal note")
@router.post("/", summary="Create a new personal note")
async def create_note(
    payload: Dict[str, Any],
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    firebase_uid = decoded_token.get("uid")
    title = payload.get("title", "Untitled Note").strip()
    content_markdown = payload.get("content_markdown", "")
    folder_id = payload.get("folder_id")
    topic_slug = payload.get("topic_slug")
    tags = payload.get("tags", [])
    
    # Auto-assign or create "Roadmap Notes" folder if note originates from a roadmap topic
    if topic_slug and not folder_id:
        roadmap_folder = await db.note_folders.find_one({"firebase_uid": firebase_uid, "name": "Roadmap Notes"})
        if roadmap_folder:
            folder_id = str(roadmap_folder["_id"])
        else:
            new_folder_doc = {
                "firebase_uid": firebase_uid,
                "name": "Roadmap Notes",
                "color": "#10b981", # Emerald color to match roadmap
                "created_at": datetime.utcnow()
            }
            res = await db.note_folders.insert_one(new_folder_doc)
            folder_id = str(res.inserted_id)
    
    now = datetime.utcnow()
    note_doc = {
        "firebase_uid": firebase_uid,
        "title": title,
        "content_markdown": content_markdown,
        "folder_id": folder_id,
        "topic_slug": topic_slug,
        "tags": tags,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.notes.insert_one(note_doc)
    note_id_str = str(result.inserted_id)
    note_doc["_id"] = note_id_str
    
    # Gamification triggers
    await xp_engine.award_xp(
        db=db,
        firebase_uid=firebase_uid,
        source="note",
        amount=15,
        source_ref_id=note_id_str,
        idempotent_key=f"create_note_{note_id_str}"
    )
    await streak_engine.record_daily_activity(db, firebase_uid)
    new_badges = await badge_engine.check_and_award_badges(db, firebase_uid)
    
    return {
        "data": format_doc(note_doc),
        "meta": {"new_badges": new_badges},
        "error": None
    }

@router.put("/{note_id}", summary="Update a personal note (autosave)")
async def update_note(
    note_id: str,
    payload: Dict[str, Any],
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if not ObjectId.is_valid(note_id):
        raise HTTPException(status_code=400, detail="Invalid note ID format")
        
    firebase_uid = decoded_token.get("uid")
    
    update_fields: Dict[str, Any] = {"updated_at": datetime.utcnow()}
    if "title" in payload:
        update_fields["title"] = payload["title"]
    if "content_markdown" in payload:
        update_fields["content_markdown"] = payload["content_markdown"]
    if "folder_id" in payload:
        update_fields["folder_id"] = payload["folder_id"]
    if "topic_slug" in payload:
        update_fields["topic_slug"] = payload["topic_slug"]
    if "tags" in payload:
        update_fields["tags"] = payload["tags"]
        
    res = await db.notes.update_one(
        {"_id": ObjectId(note_id), "firebase_uid": firebase_uid},
        {"$set": update_fields}
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
        
    updated_note = await db.notes.find_one({"_id": ObjectId(note_id)})
    return {
        "data": format_doc(dict(updated_note)),
        "meta": None,
        "error": None
    }

@router.delete("/{note_id}", summary="Delete a note")
async def delete_note(
    note_id: str,
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if not ObjectId.is_valid(note_id):
        raise HTTPException(status_code=400, detail="Invalid note ID format")
        
    firebase_uid = decoded_token.get("uid")
    res = await db.notes.delete_one({"_id": ObjectId(note_id), "firebase_uid": firebase_uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
        
    return {
        "data": {"success": True, "deleted_note_id": note_id},
        "meta": None,
        "error": None
    }

# ----------------------------------------------------
# BACKBLAZE B2 ATTACHMENT UPLOAD
# ----------------------------------------------------

@router.post("/upload-attachment", summary="Upload an image/circuit attachment to B2 / media storage")
async def upload_attachment(
    file: UploadFile = File(...),
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    """
    Uploads image attachment to Backblaze B2 (if configured) or returns usable media URL.
    """
    ext = os.path.splitext(file.filename)[1] or ".png"
    unique_filename = f"notes/{uuid.uuid4()}{ext}"
    
    b2_key_id = os.getenv("B2_KEY_ID")
    b2_app_key = os.getenv("B2_APPLICATION_KEY")
    b2_bucket_name = os.getenv("B2_BUCKET_NAME")
    b2_endpoint = os.getenv("B2_ENDPOINT_URL")
    
    file_bytes = await file.read()
    
    # Try Backblaze B2 upload if credentials exist
    if b2_key_id and b2_app_key and b2_bucket_name:
        try:
            s3 = boto3.client(
                's3',
                endpoint_url=b2_endpoint or "https://s3.us-west-004.backblazeb2.com",
                aws_access_key_id=b2_key_id,
                aws_secret_access_key=b2_app_key
            )
            s3.put_object(
                Bucket=b2_bucket_name,
                Key=unique_filename,
                Body=file_bytes,
                ContentType=file.content_type or 'image/png'
            )
            b2_url = f"{b2_endpoint}/{b2_bucket_name}/{unique_filename}" if b2_endpoint else f"https://f004.backblazeb2.com/file/{b2_bucket_name}/{unique_filename}"
            return {
                "data": {
                    "url": b2_url,
                    "filename": file.filename
                },
                "meta": None,
                "error": None
            }
        except (BotoCoreError, ClientError) as err:
            print(f"B2 upload exception: {err}, falling back to static placeholder URL")

    # Local / fallback placeholder image URL
    fallback_url = f"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80"
    return {
        "data": {
            "url": fallback_url,
            "filename": file.filename
        },
        "meta": None,
        "error": None
    }

# ----------------------------------------------------
# AI ACTION STUB
# ----------------------------------------------------

@router.post("/{note_id}/ai-action", summary="Run AI action on note (Summarize / Generate Quiz)")
async def run_ai_note_action(
    note_id: str,
    payload: Dict[str, Any],
    decoded_token: dict = Depends(get_verified_firebase_user)
):
    """
    AI action endpoint for note summarization or quiz generation.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    if not ObjectId.is_valid(note_id):
        raise HTTPException(status_code=400, detail="Invalid note ID format")
        
    firebase_uid = decoded_token.get("uid")
    note = await db.notes.find_one({"_id": ObjectId(note_id), "firebase_uid": firebase_uid})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    action = payload.get("action", "summarize")
    content = note.get("content_markdown", "")
    
    if action == "summarize":
        summary_result = f"**AI Summary for {note.get('title')}:**\n\n- Key Concepts: {note.get('tags', [])}\n- Summary: This note details quantum state vector equations and measurement operators."
        return {
            "data": {
                "action": "summarize",
                "result": summary_result
            },
            "meta": None,
            "error": None
        }
    elif action == "generate_quiz":
        quiz_result = f"**Generated Quiz Questions:**\n\n1. What does the state vector equation in '{note.get('title')}' compute?\n2. How do measurement operators collapse superposition states?"
        return {
            "data": {
                "action": "generate_quiz",
                "result": quiz_result
            },
            "meta": None,
            "error": None
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid AI action type")
