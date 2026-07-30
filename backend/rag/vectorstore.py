"""Vector store abstraction over a raw chromadb client (not langchain's Chroma
wrapper) — embeddings are always computed externally via EmbeddingProvider and
handed in as plain vectors, so this class never knows which embedding model
produced them. Persisted separately from services/chroma_service.py's
`quantum_docs` AI-tutor collection (different persist dir entirely — see
rag/config.py's CHROMA_RAG_PERSIST_DIR) since that's a single global
collection and this needs real per-study-space isolation.
"""
import asyncio
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from rag.config import CHROMA_RAG_PERSIST_DIR


class VectorStore(ABC):
    @abstractmethod
    async def add(self, study_space_id: str, source_id: str, chunk_ids: List[str], texts: List[str], embeddings: List[List[float]]) -> None:
        ...

    @abstractmethod
    async def delete_source(self, study_space_id: str, source_id: str) -> None:
        ...

    @abstractmethod
    async def delete_space(self, study_space_id: str) -> None:
        ...

    @abstractmethod
    async def query(self, study_space_id: str, query_embedding: List[float], top_n: int, source_ids: Optional[List[str]] = None) -> List[Tuple[str, float]]:
        """Returns [(chunk_id, similarity_score), ...] ordered best-first."""
        ...


class ChromaVectorStore(VectorStore):
    def __init__(self, persist_directory: str):
        self._persist_directory = persist_directory
        self._client = None

    @property
    def _chroma_client(self):
        if self._client is None:
            import os
            os.makedirs(self._persist_directory, exist_ok=True)
            import chromadb
            self._client = chromadb.PersistentClient(path=self._persist_directory)
        return self._client

    def _collection(self, study_space_id: str):
        # cosine distance — matches BAAI/bge-small's training objective.
        return self._chroma_client.get_or_create_collection(
            name=f"qstudio_rag_{study_space_id}",
            metadata={"hnsw:space": "cosine"},
        )

    async def add(self, study_space_id: str, source_id: str, chunk_ids: List[str], texts: List[str], embeddings: List[List[float]]) -> None:
        if not chunk_ids:
            return
        metadatas = [{"source_id": source_id} for _ in chunk_ids]

        def _do_add():
            self._collection(study_space_id).add(
                ids=chunk_ids, embeddings=embeddings, documents=texts, metadatas=metadatas,
            )
        await asyncio.to_thread(_do_add)

    async def delete_source(self, study_space_id: str, source_id: str) -> None:
        def _do_delete():
            self._collection(study_space_id).delete(where={"source_id": source_id})
        await asyncio.to_thread(_do_delete)

    async def delete_space(self, study_space_id: str) -> None:
        def _do_delete():
            try:
                self._chroma_client.delete_collection(name=f"qstudio_rag_{study_space_id}")
            except Exception:
                pass  # never indexed / already gone — nothing to clean up
        await asyncio.to_thread(_do_delete)

    async def query(self, study_space_id: str, query_embedding: List[float], top_n: int, source_ids: Optional[List[str]] = None) -> List[Tuple[str, float]]:
        def _do_query():
            collection = self._collection(study_space_id)
            if collection.count() == 0:
                return []
            where = {"source_id": {"$in": source_ids}} if source_ids else None
            result = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_n, collection.count()),
                where=where,
            )
            ids = result.get("ids", [[]])[0]
            distances = result.get("distances", [[]])[0]
            # cosine distance -> similarity, so higher is always "more relevant"
            # regardless of retriever — matches BM25's own higher-is-better scale.
            return [(chunk_id, 1.0 - dist) for chunk_id, dist in zip(ids, distances)]
        return await asyncio.to_thread(_do_query)


vector_store: VectorStore = ChromaVectorStore(CHROMA_RAG_PERSIST_DIR)
