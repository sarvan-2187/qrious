"""Reciprocal Rank Fusion — combines the semantic and lexical candidate
rankings into one ordering without needing either retriever's raw scores to
be on a comparable scale (cosine similarity and BM25 score are not)."""
from typing import Dict, List, Tuple

from rag.config import RRF_K


def reciprocal_rank_fusion(rankings: List[List[str]], k: int = RRF_K) -> List[Tuple[str, float]]:
    """`rankings` is a list of chunk_id lists, each already best-first from one
    retriever. Returns [(chunk_id, fused_score), ...] best-first."""
    scores: Dict[str, float] = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda pair: pair[1], reverse=True)
