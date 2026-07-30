"""Orchestrates the two RAG entry points other modules call:
  - index_source_for_rag / reindex_source_for_rag: ingestion (parse -> chunk ->
    embed -> index), triggered from qstudio_router's existing confirm/create
    source endpoints.
  - answer_question: the query-time pipeline (contextualize -> hybrid
    retrieve -> fuse -> rerank -> gate -> build context -> generate -> cite).

Everything else in rag/ is a building block this file wires together — no
other module reaches into Mongo or knows the end-to-end shape.
"""
import asyncio
import hashlib
import time
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId

from ai import ChatMessage
from models.qstudio_rag import RagAnswer, RagCitation, RagQueryResponse, RagRetrievalMeta, SourceRagStatusOut
from rag.chunking import chunk_units
from rag.config import CONVERSATION_HISTORY_TURNS, MIN_RELEVANCE_SCORE, RERANK_TOP_K, RETRIEVAL_TOP_N
from rag.context_builder import RankedChunk, build_context
from rag.embeddings import embedding_provider
from rag.fusion import reciprocal_rank_fusion
from rag.generation import generate_answer, insufficient_evidence_answer
from rag.lexical import bm25_rank
from rag.parsing import parse_source
from rag.query_processing import contextualize_query
from rag.reranker import reranker
from rag.vectorstore import vector_store


# --------------------------------------------------------------------------
# Ingestion
# --------------------------------------------------------------------------

def _content_hash(raw_text: Optional[str], raw_bytes: Optional[bytes]) -> str:
    payload = raw_text.encode("utf-8") if raw_text is not None else (raw_bytes or b"")
    return hashlib.sha256(payload).hexdigest()


async def index_source(
    db,
    study_space_id: str,
    source_id: str,
    owner_uid: str,
    kind: str,
    document_name: str,
    raw_text: Optional[str],
    raw_bytes: Optional[bytes],
    force: bool = False,
) -> None:
    content_hash = _content_hash(raw_text, raw_bytes)
    source_oid = ObjectId(source_id)

    existing = await db.qstudio_sources.find_one({"_id": source_oid}, {"content_hash": 1})
    if not force and existing and existing.get("content_hash") == content_hash:
        return  # unchanged since the last successful index — nothing to do

    await db.qstudio_sources.update_one({"_id": source_oid}, {"$set": {"rag_status": "processing", "rag_error": None}})
    try:
        units = parse_source(kind, document_name, raw_text, raw_bytes)
        chunks = chunk_units(units)

        await db.qstudio_rag_chunks.delete_many({"study_space_id": ObjectId(study_space_id), "source_id": source_id})
        await vector_store.delete_source(study_space_id, source_id)

        if not chunks:
            await db.qstudio_sources.update_one(
                {"_id": source_oid},
                {"$set": {"rag_status": "ready", "rag_error": None, "content_hash": content_hash, "chunk_count": 0}},
            )
            return

        texts = [c.text for c in chunks]
        embeddings = await embedding_provider.embed_documents(texts)

        chunk_ids: List[str] = []
        chunk_docs = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{source_id}_{i}"
            chunk_ids.append(chunk_id)
            chunk_docs.append({
                "study_space_id": ObjectId(study_space_id),
                "source_id": source_id,
                "owner_uid": owner_uid,
                "chunk_id": chunk_id,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "parent_text": chunk.parent_text,
                "page": chunk.page,
                "section": chunk.section,
                "document_name": document_name,
                "source_type": kind,
            })

        await db.qstudio_rag_chunks.insert_many(chunk_docs)
        await vector_store.add(study_space_id, source_id, chunk_ids, texts, embeddings)

        await db.qstudio_sources.update_one(
            {"_id": source_oid},
            {"$set": {"rag_status": "ready", "rag_error": None, "content_hash": content_hash, "chunk_count": len(chunk_docs)}},
        )
        print(f"[qstudio-rag {study_space_id}] indexed source {source_id}: {len(chunk_docs)} chunks", flush=True)
    except Exception as e:
        print(f"[qstudio-rag {study_space_id}] failed to index source {source_id}: {e}", flush=True)
        await db.qstudio_sources.update_one({"_id": source_oid}, {"$set": {"rag_status": "failed", "rag_error": str(e)}})


async def index_source_for_rag(
    source_id: str, study_space_id: str, owner_uid: str, kind: str, filename: Optional[str],
    raw_text: Optional[str], force: bool = False,
) -> None:
    """Entry point for BackgroundTasks — takes plain serializable args (no db
    handle) exactly like qstudio_router's other _trigger_* background jobs."""
    from database import get_db
    from storage_service import download_bytes

    db = get_db()
    document_name = filename or "Pasted text"
    raw_bytes = None
    if kind == "pdf":
        source_doc = await db.qstudio_sources.find_one({"_id": ObjectId(source_id)})
        if not source_doc or not source_doc.get("b2_key"):
            print(f"[qstudio-rag] source {source_id} missing b2_key, cannot index for RAG", flush=True)
            return
        raw_bytes = await asyncio.to_thread(download_bytes, source_doc["b2_key"])
        raw_text = None
    await index_source(db, study_space_id, source_id, owner_uid, kind, document_name, raw_text, raw_bytes, force=force)


async def reindex_source(source_doc: dict) -> None:
    """Manual/auto reindex (POST /sources/{id}/reindex) — always forces a
    re-embed, bypassing the content_hash short-circuit. Also how a source
    created before RAG indexing existed (rag_status="not_indexed" forever,
    since indexing only auto-triggers from the confirm/create endpoints)
    gets backfilled — see SourceChatPanel.tsx's auto-trigger-once-per-source
    effect."""
    await index_source_for_rag(
        source_id=str(source_doc["_id"]),
        study_space_id=str(source_doc["study_space_id"]),
        owner_uid=source_doc["owner_uid"],
        kind=source_doc["kind"],
        filename=source_doc.get("filename"),
        raw_text=source_doc.get("text"),
        force=True,
    )


async def remove_source_index(db, study_space_id: str, source_id: str) -> None:
    await db.qstudio_rag_chunks.delete_many({"study_space_id": ObjectId(study_space_id), "source_id": source_id})
    await vector_store.delete_source(study_space_id, source_id)


async def remove_space_index(db, study_space_id: str) -> None:
    await db.qstudio_rag_chunks.delete_many({"study_space_id": ObjectId(study_space_id)})
    await db.qstudio_rag_messages.delete_many({"study_space_id": ObjectId(study_space_id)})
    await vector_store.delete_space(study_space_id)


async def get_rag_status(db, source_doc: dict) -> SourceRagStatusOut:
    return SourceRagStatusOut(
        rag_status=source_doc.get("rag_status", "not_indexed"),
        rag_error=source_doc.get("rag_error"),
        chunk_count=source_doc.get("chunk_count", 0),
    )


# --------------------------------------------------------------------------
# Query
# --------------------------------------------------------------------------

async def answer_question(
    db, study_space_id: str, owner_uid: str, question: str, source_ids: Optional[List[str]],
    persist: bool = True,
) -> RagQueryResponse:
    t_start = time.perf_counter()

    history_cursor = db.qstudio_rag_messages.find(
        {"study_space_id": ObjectId(study_space_id)}
    ).sort("created_at", -1).limit(CONVERSATION_HISTORY_TURNS * 2)
    history_docs = list(reversed(await history_cursor.to_list(length=CONVERSATION_HISTORY_TURNS * 2)))
    history = [ChatMessage(role=d["role"], content=d["content"]) for d in history_docs]

    standalone_query = await contextualize_query(question, history, owner_uid)

    t_retrieval = time.perf_counter()
    query_embedding = await embedding_provider.embed_query(standalone_query)
    semantic_results = await vector_store.query(study_space_id, query_embedding, RETRIEVAL_TOP_N, source_ids)

    chunk_filter: dict = {"study_space_id": ObjectId(study_space_id)}
    if source_ids:
        chunk_filter["source_id"] = {"$in": source_ids}
    all_chunks = await db.qstudio_rag_chunks.find(chunk_filter).to_list(length=5000)
    chunk_by_id = {c["chunk_id"]: c for c in all_chunks}
    corpus = [(c["chunk_id"], c["text"]) for c in all_chunks]
    lexical_results = bm25_rank(standalone_query, corpus, RETRIEVAL_TOP_N)

    fused = reciprocal_rank_fusion([
        [cid for cid, _ in semantic_results],
        [cid for cid, _ in lexical_results],
    ])
    fused_top_ids = [cid for cid, _ in fused[:RETRIEVAL_TOP_N] if cid in chunk_by_id]
    retrieval_ms = (time.perf_counter() - t_retrieval) * 1000

    t_rerank = time.perf_counter()
    candidates = [(cid, chunk_by_id[cid]["text"]) for cid in fused_top_ids]
    reranked = await reranker.rerank(standalone_query, candidates)
    top_k = reranked[:RERANK_TOP_K]
    rerank_ms = (time.perf_counter() - t_rerank) * 1000

    best_score = top_k[0][1] if top_k else float("-inf")
    generation_ms = 0.0
    citations: List[RagCitation] = []
    chunks_used = 0

    if not top_k or best_score < MIN_RELEVANCE_SCORE:
        answer_obj: RagAnswer = insufficient_evidence_answer()
    else:
        ranked_chunks = [
            RankedChunk(
                chunk_id=cid,
                source_id=chunk_by_id[cid]["source_id"],
                document_name=chunk_by_id[cid]["document_name"],
                page=chunk_by_id[cid].get("page"),
                section=chunk_by_id[cid].get("section"),
                chunk_index=chunk_by_id[cid]["chunk_index"],
                text=chunk_by_id[cid]["text"],
                parent_text=chunk_by_id[cid]["parent_text"],
                score=score,
            )
            for cid, score in top_k
        ]
        context_text, manifest = build_context(ranked_chunks)
        chunks_used = len(manifest)

        t_gen = time.perf_counter()
        answer_obj = await generate_answer(question, context_text, owner_uid)
        generation_ms = (time.perf_counter() - t_gen) * 1000

        # Only ever surface citation IDs that exist in the manifest we built —
        # anything else is the model inventing an ID, dropped per §21/§10.
        citations = [manifest[cid] for cid in answer_obj.citations if cid in manifest]

    total_ms = (time.perf_counter() - t_start) * 1000

    if persist:
        now = datetime.now(timezone.utc)
        await db.qstudio_rag_messages.insert_many([
            {
                "study_space_id": ObjectId(study_space_id), "owner_uid": owner_uid,
                "role": "user", "content": question, "citations": [], "created_at": now,
            },
            {
                "study_space_id": ObjectId(study_space_id), "owner_uid": owner_uid,
                "role": "assistant", "content": answer_obj.answer,
                "citations": [c.model_dump() for c in citations], "created_at": now,
            },
        ])

    print(
        f"[qstudio-rag {study_space_id}] query={standalone_query[:80]!r} "
        f"retrieval={retrieval_ms:.0f}ms rerank={rerank_ms:.0f}ms generation={generation_ms:.0f}ms "
        f"total={total_ms:.0f}ms chunks_used={chunks_used}", flush=True,
    )

    return RagQueryResponse(
        answer=answer_obj.answer,
        insufficient_evidence=answer_obj.insufficient_evidence,
        citations=citations,
        retrieval=RagRetrievalMeta(
            chunks_used=chunks_used, retrieval_ms=retrieval_ms, rerank_ms=rerank_ms,
            generation_ms=generation_ms, total_ms=total_ms,
        ),
    )
