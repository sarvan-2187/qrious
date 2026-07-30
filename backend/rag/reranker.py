"""Reranking — a cross-encoder scores (query, chunk) pairs jointly, which is
far more precise than the bi-encoder similarity used for initial retrieval,
at the cost of being too slow to run over an entire corpus (hence: rerank the
fused top-N only, not everything). Modular so a different reranker can be
swapped in later (e.g. a hosted API) without touching the retrieval pipeline.
"""
import asyncio
from abc import ABC, abstractmethod
from typing import List, Tuple

from rag.config import RERANKER_ENABLED, RERANKER_MODEL


class RerankerProvider(ABC):
    @abstractmethod
    async def rerank(self, query: str, candidates: List[Tuple[str, str]]) -> List[Tuple[str, float]]:
        """`candidates` is [(chunk_id, text), ...]. Returns the same chunk_ids
        with reranker scores, best-first."""
        ...


class NoopReranker(RerankerProvider):
    """Fallback: passes the fused ranking through unchanged. Used when
    reranking is disabled or the cross-encoder model fails to load (e.g. no
    network access to Hugging Face) — Q&A degrades to fusion-only ranking
    rather than failing outright."""

    async def rerank(self, query: str, candidates: List[Tuple[str, str]]) -> List[Tuple[str, float]]:
        # Preserve incoming order; assign descending scores so downstream
        # score-threshold logic still has something meaningful to compare.
        n = len(candidates)
        return [(chunk_id, float(n - i)) for i, (chunk_id, _text) in enumerate(candidates)]


class CrossEncoderReranker(RerankerProvider):
    def __init__(self, model_name: str):
        self._model_name = model_name
        self._model = None
        self._load_failed = False

    def _ensure_loaded(self):
        if self._model is not None or self._load_failed:
            return
        try:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self._model_name)
        except Exception as e:
            print(f"[rag.reranker] failed to load {self._model_name!r}, falling back to fusion order: {e}", flush=True)
            self._load_failed = True

    async def rerank(self, query: str, candidates: List[Tuple[str, str]]) -> List[Tuple[str, float]]:
        if not candidates:
            return []
        await asyncio.to_thread(self._ensure_loaded)
        if self._load_failed:
            return await NoopReranker().rerank(query, candidates)

        pairs = [(query, text) for _chunk_id, text in candidates]
        scores = await asyncio.to_thread(self._model.predict, pairs)
        ranked = sorted(zip([c[0] for c in candidates], scores), key=lambda pair: pair[1], reverse=True)
        return [(chunk_id, float(score)) for chunk_id, score in ranked]


def build_reranker(enabled: bool, model_name: str) -> RerankerProvider:
    return CrossEncoderReranker(model_name) if enabled else NoopReranker()


reranker: RerankerProvider = build_reranker(RERANKER_ENABLED, RERANKER_MODEL)
