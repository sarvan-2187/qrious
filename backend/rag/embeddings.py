"""Provider-agnostic embedding interface. HFEmbeddingProvider wraps the exact
model already proven in this deployment by services/chroma_service.py
(BAAI/bge-small-en-v1.5 via langchain_huggingface) — reusing it here means no
new model download/verification risk, while still keeping the RAG pipeline
itself decoupled from langchain: nothing outside this module imports
HuggingFaceEmbeddings directly, so swapping providers later (e.g. an API-
based embedding service) only touches this file.
"""
import asyncio
import os
from abc import ABC, abstractmethod
from typing import List

from rag.config import EMBEDDING_MODEL


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        ...

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        ...


class HFEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model_name: str):
        self._model_name = model_name
        self._model = None

    @property
    def _embeddings(self):
        # Lazy singleton, loaded once per process — same pattern as
        # chroma_service.ChromaService.embeddings, so the ~130MB model is
        # never re-loaded per request.
        if self._model is None:
            os.environ.setdefault("HF_HUB_OFFLINE", "0")
            try:
                from langchain_huggingface import HuggingFaceEmbeddings
            except ModuleNotFoundError:
                from langchain_community.embeddings import HuggingFaceEmbeddings
            self._model = HuggingFaceEmbeddings(model_name=self._model_name)
        return self._model

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # sentence-transformers' .encode() batches internally and is CPU-bound
        # (no native asyncio support) — offloaded to a thread so it doesn't
        # block the event loop for the ~seconds a full-source batch can take.
        return await asyncio.to_thread(self._embeddings.embed_documents, texts)

    async def embed_query(self, query: str) -> List[float]:
        return await asyncio.to_thread(self._embeddings.embed_query, query)


embedding_provider: EmbeddingProvider = HFEmbeddingProvider(EMBEDDING_MODEL)
