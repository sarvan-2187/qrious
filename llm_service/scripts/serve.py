"""FastAPI serving: retrieval -> rerank -> prompt -> generation, end to end
(Section 8). `POST /chat` answers a question, optionally grounded in the
RAG corpus built in Phase 4/5.

Retrieval/rerank/prompt-building are plain functions (testable without
loading the LLM); only `generate()` needs the GPU model. Run the server:
`uvicorn scripts.serve:app --port 8000`. Run the RAG-on/off hallucination
smoke test (Section 9) without starting a server:
`python scripts/serve.py --smoke-test`.
"""

import os

# Windows-specific: sentence-transformers (embedder + reranker) and
# transformers (the LLM) each bundle their own Intel OpenMP runtime
# (libiomp5md.dll). Loading more than one in the same process trips
# OMP Error #15 (duplicate runtime), which kills the process outright with
# no Python traceback - must be set before any of those libraries import.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

import sys
from pathlib import Path

# The merged model (base weights + LoRA adapter folded in, via
# scripts/publish_model.py --merge) - a plain standalone causal LM, no
# separate adapter-loading step needed. Same directory the Hub upload and
# the demo Space (space/app.py) serve from.
MODEL_DIR = "outputs/qrious-code-merged"
MAX_NEW_TOKENS = 512

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
QDRANT_PATH = "rag/qdrant_storage"
COLLECTION_ALIAS = "qiskit_docs"
TOP_K_RETRIEVE = 20
TOP_K_RERANK = 5

SYSTEM_PROMPT_RAG = (
    "You are a Qiskit coding assistant. Use the reference context if relevant; "
    "if the context doesn't cover the question, say so rather than guessing."
)
SYSTEM_PROMPT_NO_RAG = "You are a Qiskit coding assistant."

# Known real Qiskit deprecations/renames - good probes for whether RAG
# grounding catches outdated syntax that a purely parametric answer might not.
HALLUCINATION_PROBES = [
    "How do I use the execute() function to run a circuit on a backend?",
    "How do I build an operator using qiskit.opflow?",
    "How do I run a circuit using QuantumInstance?",
    "How do I use qiskit.aqua to run VQE?",
    "How do I load my account with IBMQ.load_account()?",
]


# --------------------------------------------------------------------------
# Retrieval / rerank / prompt (no GPU needed)
# --------------------------------------------------------------------------

def retrieve(query: str, embedder, qdrant_client, top_k: int = TOP_K_RETRIEVE) -> list[dict]:
    qvec = embedder.encode(query, normalize_embeddings=True).tolist()
    hits = qdrant_client.query_points(collection_name=COLLECTION_ALIAS, query=qvec, limit=top_k).points
    return [{"score": h.score, **h.payload} for h in hits]


def rerank(query: str, chunks: list[dict], reranker, top_k: int = TOP_K_RERANK) -> list[dict]:
    if not chunks:
        return []
    pairs = [(query, c["text"]) for c in chunks]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    return [{**c, "rerank_score": float(s)} for c, s in ranked[:top_k]]


def build_prompt(query: str, chunks: list[dict]) -> list[dict]:
    if not chunks:
        return [
            {"role": "system", "content": SYSTEM_PROMPT_NO_RAG},
            {"role": "user", "content": query},
        ]
    context = "\n".join(
        f"[{i}] {c['symbol']} ({c['doc_type']}): {c['text']}" for i, c in enumerate(chunks, 1)
    )
    user = f"Context:\n{context}\n\nQuestion: {query}"
    return [
        {"role": "system", "content": SYSTEM_PROMPT_RAG},
        {"role": "user", "content": user},
    ]


def format_sources(chunks: list[dict]) -> list[dict]:
    return [{"symbol": c["symbol"], "url": c["url"], "doc_type": c["doc_type"]} for c in chunks]


# --------------------------------------------------------------------------
# Generation (GPU/model required)
# --------------------------------------------------------------------------

def generate(model, tokenizer, messages: list[dict], max_new_tokens: int = MAX_NEW_TOKENS) -> str:
    """Single-query generation with enable_thinking=False - Qwen3's chat
    template otherwise lets the model spend the whole token budget on
    unrequested <think> reasoning before answering (found the hard way
    during Phase 3 eval: truncated, answer-less output under a tight budget)."""
    inputs = tokenizer.apply_chat_template(
        messages, tokenize=True, return_dict=True, add_generation_prompt=True, enable_thinking=False, return_tensors="pt"
    ).to(model.device)
    out = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
    )
    prompt_len = inputs["input_ids"].shape[1]
    return tokenizer.decode(out[0][prompt_len:], skip_special_tokens=True)


class Assistant:
    """Lazily loads everything once; reused across requests/smoke-test probes."""

    def __init__(self):
        self._embedder = None
        self._reranker = None
        self._qdrant = None
        self._model = None
        self._tokenizer = None

    @property
    def embedder(self):
        if self._embedder is None:
            from sentence_transformers import SentenceTransformer

            self._embedder = SentenceTransformer(EMBED_MODEL)
        return self._embedder

    @property
    def reranker(self):
        if self._reranker is None:
            from sentence_transformers import CrossEncoder

            self._reranker = CrossEncoder(RERANK_MODEL)
        return self._reranker

    @property
    def qdrant(self):
        if self._qdrant is None:
            from qdrant_client import QdrantClient

            self._qdrant = QdrantClient(path=QDRANT_PATH)
        return self._qdrant

    def _ensure_model(self):
        if self._model is not None:
            return
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        # The local qrious-code-merged folder is missing its tokenizer.json / vocab files!
        # We load the exact matching tokenizer from the HuggingFace Hub instead.
        tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-Coder-1.5B-Instruct")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_DIR,
            dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            low_cpu_mem_usage=True,
        )
        model.eval()
        if torch.cuda.is_available():
            model = model.to("cuda")
        self._model, self._tokenizer = model, tokenizer

    def answer(self, question: str, use_rag: bool = True) -> dict:
        chunks = []
        if use_rag:
            retrieved = retrieve(question, self.embedder, self.qdrant)
            chunks = rerank(question, retrieved, self.reranker)
        messages = build_prompt(question, chunks)
        self._ensure_model()
        text = generate(self._model, self._tokenizer, messages)
        return {"answer": text, "sources": format_sources(chunks)}


def smoke_test() -> None:
    assistant = Assistant()
    for question in HALLUCINATION_PROBES:
        print("=" * 80)
        print("Q:", question)
        for use_rag in (True, False):
            result = assistant.answer(question, use_rag=use_rag)
            label = "RAG ON " if use_rag else "RAG OFF"
            print(f"\n[{label}] {result['answer']}")
            if result["sources"]:
                print("  sources:", ", ".join(s["symbol"] for s in result["sources"]))
        print()


# --------------------------------------------------------------------------
# FastAPI app
# --------------------------------------------------------------------------

def create_app():
    from fastapi import FastAPI
    from fastapi.responses import FileResponse
    from pydantic import BaseModel

    app = FastAPI(title="Qrious Code")
    assistant = Assistant()

    class ChatRequest(BaseModel):
        question: str
        use_rag: bool = True

    @app.get("/")
    def demo_page():
        return FileResponse("demo.html")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/chat")
    def chat(req: ChatRequest):
        return assistant.answer(req.question, use_rag=req.use_rag)

    return app


try:
    app = create_app()
except ImportError:
    app = None  # fastapi not installed; --smoke-test doesn't need it


if __name__ == "__main__":
    if "--smoke-test" in sys.argv:
        smoke_test()
    else:
        print(__doc__)
