"""BM25 lexical retrieval — catches exact technical terms, equations-as-text,
names, and IDs that embedding similarity alone tends to blur past. Rebuilt
fresh from Mongo on every query rather than cached: at qStudio's per-study-
space corpus size (a handful of sources, a few hundred chunks at most) a
rank_bm25 build is low-single-digit milliseconds, so a cache would add
invalidation complexity for a stage that was never the bottleneck. See
PLANS/qstudio-rag.md §5.
"""
import re
from typing import List, Tuple

from rank_bm25 import BM25Okapi

_TOKEN_RE = re.compile(r"[A-Za-z0-9_]+")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_RE.findall(text.lower())


def bm25_rank(query: str, corpus: List[Tuple[str, str]], top_n: int) -> List[Tuple[str, float]]:
    """`corpus` is [(chunk_id, text), ...]. Returns [(chunk_id, score), ...]
    best-first, scores >= 0 (BM25Okapi's own scale, not comparable across
    calls — only used for within-call ranking before fusion)."""
    if not corpus:
        return []
    chunk_ids = [c[0] for c in corpus]
    tokenized_corpus = [_tokenize(c[1]) for c in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    scores = bm25.get_scores(_tokenize(query))
    ranked = sorted(zip(chunk_ids, scores), key=lambda pair: pair[1], reverse=True)
    return ranked[:top_n]
