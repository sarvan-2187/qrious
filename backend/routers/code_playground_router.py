from fastapi import APIRouter, Depends, HTTPException
from typing import List
from auth import get_current_user
from models.code_execution_model import CodeExecutionRequest, CodeExecutionResult, CodeSnippet, SaveSnippetRequest
from services.code_execution_service import code_execution_service
from database import get_db
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/code", tags=["Code Playground"])

@router.post("/execute", response_model=CodeExecutionResult)
async def execute_code(request: CodeExecutionRequest, current_user: dict = Depends(get_current_user)):
    result_dict = code_execution_service.execute_code(request.source_code)
    return CodeExecutionResult(**result_dict)

@router.post("/snippets", response_model=CodeSnippet)
async def save_snippet(request: SaveSnippetRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    collection = db["code_snippets"]
    snippet_id = str(uuid.uuid4())
    
    doc = {
        "id": snippet_id,
        "user_id": str(current_user["_id"]),
        "title": request.title,
        "source_code": request.source_code,
        "created_at": datetime.now(timezone.utc)
    }
    await collection.insert_one(doc)
    return CodeSnippet(**doc)

@router.get("/snippets", response_model=List[CodeSnippet])
async def list_snippets(current_user: dict = Depends(get_current_user)):
    db = get_db()
    collection = db["code_snippets"]
    cursor = collection.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    snippets = []
    async for doc in cursor:
        snippets.append(CodeSnippet(**doc))
    return snippets
