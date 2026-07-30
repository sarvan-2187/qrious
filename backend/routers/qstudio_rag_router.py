from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from auth import get_current_user
from database import get_db
from models.lms import serialize
from models.qstudio_rag import RagMessageOut, RagQueryRequest, RagQueryResponse, SourceRagStatusOut
from rag.pipeline import answer_question, reindex_source
from routers.qstudio_router import _get_owned_source, _get_owned_study_space

router = APIRouter(prefix="/api/v1/qstudio", tags=["qStudio RAG"])


@router.post("/study-spaces/{study_space_id}/qa", response_model=RagQueryResponse)
async def ask_question(study_space_id: str, request: RagQueryRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["firebase_uid"]
    await _get_owned_study_space(db, study_space_id, uid)

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if request.source_ids:
        for source_id in request.source_ids:
            await _get_owned_source(db, source_id, uid)

    return await answer_question(db, study_space_id, uid, request.question, request.source_ids)


@router.get("/study-spaces/{study_space_id}/qa/messages", response_model=list[RagMessageOut])
async def list_qa_messages(study_space_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["firebase_uid"]
    study_space = await _get_owned_study_space(db, study_space_id, uid)
    cursor = db.qstudio_rag_messages.find({"study_space_id": study_space["_id"]}).sort("created_at", 1)
    return [serialize(doc, RagMessageOut) async for doc in cursor]


@router.delete("/study-spaces/{study_space_id}/qa/messages", status_code=status.HTTP_204_NO_CONTENT)
async def clear_qa_messages(study_space_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["firebase_uid"]
    study_space = await _get_owned_study_space(db, study_space_id, uid)
    await db.qstudio_rag_messages.delete_many({"study_space_id": study_space["_id"]})


@router.post("/sources/{source_id}/reindex", response_model=SourceRagStatusOut)
async def reindex_source_endpoint(source_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["firebase_uid"]
    doc = await _get_owned_source(db, source_id, uid)
    if doc["kind"] == "pdf" and doc["status"] != "confirmed":
        raise HTTPException(status_code=409, detail="Source upload isn't confirmed yet")

    # Backgrounded exactly like every other qStudio ingestion/generation job —
    # embedding a full source can take several seconds (longer on a cold
    # model load), too long to hold the request open for. The frontend polls
    # GET /sources/{id}/rag-status the same way it polls output generation.
    background_tasks.add_task(reindex_source, doc)
    return SourceRagStatusOut(rag_status="processing", rag_error=None, chunk_count=doc.get("chunk_count", 0))


@router.get("/sources/{source_id}/rag-status", response_model=SourceRagStatusOut)
async def get_source_rag_status(source_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["firebase_uid"]
    doc = await _get_owned_source(db, source_id, uid)
    return SourceRagStatusOut(
        rag_status=doc.get("rag_status", "not_indexed"),
        rag_error=doc.get("rag_error"),
        chunk_count=doc.get("chunk_count", 0),
    )
