"""Central, env-driven configuration for the qStudio RAG pipeline — same
pattern as ai/config.py, so every threshold below is overridable without a
code change. See PLANS/qstudio-rag.md for why each default was picked.
"""
import os


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    return int(raw) if raw else default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    return float(raw) if raw else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# --- Chunking ---
CHUNK_TARGET_CHARS = _env_int("RAG_CHUNK_TARGET_CHARS", 900)
CHUNK_OVERLAP_CHARS = _env_int("RAG_CHUNK_OVERLAP_CHARS", 150)
PARENT_WINDOW_CHARS = _env_int("RAG_PARENT_WINDOW_CHARS", 2400)

# --- Retrieval ---
RETRIEVAL_TOP_N = _env_int("RAG_RETRIEVAL_TOP_N", 20)   # candidates per retriever, before fusion
RERANK_TOP_K = _env_int("RAG_RERANK_TOP_K", 6)           # chunks actually handed to the LLM
RRF_K = _env_int("RAG_RRF_K", 60)                        # Reciprocal Rank Fusion constant

# --- Confidence gate ---
# Reranker (CrossEncoder ms-marco-MiniLM-L-6-v2) scores are unbounded logits,
# not a 0-1 similarity — this threshold was picked by informal calibration
# (see rag/eval.py), not a formal study. Tune per PLANS/qstudio-rag.md §5.
MIN_RELEVANCE_SCORE = _env_float("RAG_MIN_RELEVANCE_SCORE", -3.0)

# --- Context construction ---
CONTEXT_MAX_CHARS = _env_int("RAG_CONTEXT_MAX_CHARS", 6000)

# --- Reranker ---
RERANKER_ENABLED = _env_bool("RAG_RERANKER_ENABLED", True)
RERANKER_MODEL = os.getenv("RAG_RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

# --- Embeddings ---
EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

# --- Vector store ---
CHROMA_RAG_PERSIST_DIR = os.getenv(
    "RAG_CHROMA_PERSIST_DIR",
    os.path.join(os.path.dirname(__file__), "..", "qstudio_rag_chroma_db"),
)

# --- Conversation ---
CONVERSATION_HISTORY_TURNS = _env_int("RAG_CONVERSATION_HISTORY_TURNS", 4)
