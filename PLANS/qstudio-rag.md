# QStudio — Source-Grounded RAG (NotebookLM-style Q&A)

## 0. Phase 1 — Repository analysis (what already exists)

- **Study spaces / sources / outputs already live entirely in `backend/`**, not `qstudio_service/` — `routers/qstudio_router.py` owns `qstudio_study_spaces`/`qstudio_sources`/`qstudio_outputs` (MongoDB), `models/qstudio.py` has the Pydantic shapes, `storage_service.py` handles B2 upload/download. `qstudio_service/` (a separate Docker container) only ever receives a flat `grounding_text` string over HTTP for the heavy media pipelines (audio/slides/video/manim) — it has no source/document access of its own. **Conclusion: the RAG layer belongs in `backend/`**, reusing the existing source/study-space infrastructure directly, not as a new qstudio_service feature.
- **Sources today**: `SourceKind = Literal["pdf", "text"]`. PDF text is extracted once via `pypdf` at confirm-time (`_extract_pdf_text`, capped at 50k chars) and stored flat on the Mongo doc as `extracted_text`; text sources store raw `text`. Both feed `_get_grounding_text()`, which concatenates every confirmed source's text and truncates to `GROUNDING_MAX_CHARS` (8,000 chars) for the six existing output generators. **This grounding-text path is untouched by this work** — Mind Map/Flashcards/Briefing/Video/Audio/Slides/Animation keep using it exactly as before.
- **An existing RAG system already exists, but for a different feature**: `services/chroma_service.py` + `services/langchain_service.py` power the general AI tutor chat — a single global Chroma collection (`quantum_docs`), `HuggingFaceEmbeddings(BAAI/bge-small-en-v1.5)`, seeded with a handful of static quantum-computing facts, one flat `as_retriever(k=3)` call, no per-user/per-space scoping, no reranking, no citations. This proves the embedding model + Chroma combination already works end-to-end in this exact deployment (no new heavy dependency risk), but its shape (one shared global collection) is wrong for source-scoped, cited, multi-tenant retrieval — a new per-study-space index is needed, not a reuse of `quantum_docs`.
- **Multi-AI Gateway** (`ai/gateway.py`, `ai/config.py`) already has `AITask.RAG` defined (used by the tutor above) and a `AITask.CHAT` task pre-mapped to a small/fast Groq model (`gpt-oss-20b`) — reused here for query rewriting rather than adding a new task enum value.
- **Frontend layout** (`QStudioStudySpacePage.tsx`) is already a 3-pane NotebookLM-style shell: Sources (left) | Workspace (center) | Studio (right). The center pane currently shows a static empty state when nothing is selected — that's exactly where NotebookLM's chat lives, so the new chat panel replaces that empty state rather than adding a fourth pane.
- **Dependencies already present** in `backend/requirements.txt`: `chromadb`, `sentence-transformers`, `langchain*`, `pypdf`. Only one new dependency is needed: `rank-bm25` (pure Python, no native build) for lexical retrieval.

## 1. Architecture

```text
Parser          pypdf (page-aware) for PDF; markdown-heading-aware splitter for text sources.
                 Same two SourceKinds qStudio already supports — DOCX/URL are a documented
                 future extension (would need SourceKind/upload-flow changes, out of scope).
Chunker          Structure-aware, paragraph-boundary packing to ~900 chars w/ overlap,
                 page/section metadata preserved, parent-window text stored per chunk for
                 wider context at generation time.
Embedding        BAAI/bge-small-en-v1.5 via a provider-agnostic EmbeddingProvider interface
model/provider   (same model already proven by chroma_service.py) — swappable without
                 touching retrieval/generation code.
Vector store     ChromaDB, ONE persistent collection per study space (qstudio_rag_<id>),
                 separate persist dir from the AI tutor's quantum_docs — real per-notebook
                 isolation instead of one shared global collection. Raw chromadb client
                 (not langchain's wrapper), so embeddings are computed externally and handed
                 in — keeps VectorStore and EmbeddingProvider genuinely decoupled.
Lexical          rank-bm25, rebuilt from Mongo chunk docs per query. At this corpus size
retrieval        (a handful of sources per study space) a fresh BM25 build costs low-single-
                 digit milliseconds — deliberately not cached; see §5.
Hybrid fusion    Reciprocal Rank Fusion over the semantic + lexical candidate lists.
Reranker         CrossEncoder (cross-encoder/ms-marco-MiniLM-L-6-v2, sentence-transformers —
                 already a dependency, no new package) over the fused top-N. Falls back to
                 fused order if the model fails to load (e.g. offline), never hard-fails Q&A.
Context builder  Dedupes, merges adjacent chunks from the same source, budgets by char count,
                 expands each surviving chunk to its parent window, tags every block
                 [SOURCE: name | PAGE: n | CHUNK: id].
Generation       ai_gateway.chat(task=AITask.RAG, response_model=RagAnswer) — same
                 structured-output pattern already used by mindmap/flashcards/briefing.
                 System prompt enforces groundedness, citation, and "documents are data,
                 not instructions" (prompt-injection defense, §7).
Citations        Server-assigned S1..Sn IDs in the context manifest; the LLM only ever
                 echoes an ID, never invents page numbers/text — IDs it returns that aren't
                 in the manifest are dropped before the response is sent to the frontend.
```

## 2. Data model (additive — nothing existing is changed)

- `qstudio_sources` gains `rag_status` (`not_indexed|processing|ready|failed`), `rag_error`, `content_hash` — additive fields, existing consumers (`SourceOut`, the six output generators) are unaffected.
- New collection `qstudio_rag_chunks`: one doc per chunk (`study_space_id`, `source_id`, `owner_uid`, `chunk_id`, `chunk_index`, `text`, `parent_text`, `page`, `section`, `document_name`, `source_type`). Mongo is the source of truth for chunk text/metadata; Chroma stores only the embedding + the minimal metadata needed for a `where` filter (`study_space_id`, `source_id`).
- New collection `qstudio_rag_messages`: persisted chat turns per study space (`role`, `content`, `citations`), so the Q&A panel survives a page reload like every other qStudio output.

## 3. Indexing lifecycle

Ingestion piggybacks on the **existing** confirm/create endpoints rather than adding a separate manual "ingest" call (`confirm_source_upload` for PDFs, `create_text_source` for text) — a `BackgroundTasks` job chunks+embeds+indexes right after the existing `extracted_text`/`text` is written, so there's exactly one place text enters the system. `content_hash` (sha256) skips re-embedding unchanged content on a manual reindex. Deleting a source or study space synchronously purges its chunks + vectors (extends the existing `delete_source`/`delete_study_space` handlers).

**Backfill for pre-existing sources.** A source uploaded before this feature shipped has no trigger that ever fires for it — it sits at `rag_status="not_indexed"` forever, and the chat input stays correctly-but-confusingly disabled with no obvious next step. Rather than a one-off migration script, `SourcesPanel.tsx` self-heals this: on load, it fires `POST /sources/{id}/reindex` once per `not_indexed` source it sees (tracked via a ref so it only ever fires once per source per session), and `SourceChatPanel.tsx` polls sources while anything is still `processing`/`not_indexed` so the input unlocks the moment indexing finishes, with no manual reload. The same reindex endpoint also backs a manual retry button shown on `rag_status="failed"` sources. `reindex_source_endpoint` is backgrounded (not awaited inline) for the same reason every other qStudio generation endpoint is — embedding a real source can take several seconds, too long to hold a request open for.

## 4. Grounding rules (generation system prompt)

Base claims on retrieved sources only; cite with the manifest's `[S#]` IDs; explicitly say so if evidence is insufficient (checked *before* generation via a minimum fused/reranked score gate — no LLM call is wasted on a query with nothing relevant retrieved); surface disagreement across sources rather than silently picking one; never fabricate a citation, page number, or quote.

## 5. Deliberately out of scope / documented limitations

- DOCX and URL sources — `SourceKind` stays `pdf|text`; adding either touches the existing upload flow and was judged out of scope for this pass. `DocumentParser` is already dispatch-based so adding a parser later is additive.
- BM25 index caching — corpus sizes here are small enough that a per-query rebuild is cheap; embeddings (the actually expensive step) are the thing that's cached (via `content_hash`).
- A dedicated hosted reranking API — a local CrossEncoder avoids a new external dependency/cost and keeps the whole pipeline runnable offline, at the cost of somewhat weaker reranking quality than e.g. Cohere Rerank.
- Retrieval-quality eval is a lightweight harness (`rag/eval.py`) against hand-written representative queries, not a labeled benchmark — there's no existing labeled QStudio dataset to evaluate against.
