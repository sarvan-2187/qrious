# QPilot — AI Coding Assistant for qBook

## Context

qBook (`frontend/src/modules/qbook/`, `backend/routers/qbook_router.py`, `notebook_service/`) is this platform's Qiskit/Python notebook playground — real `ipykernel` execution per session, cells with Monaco editors, streamed outputs/errors over a WebSocket. Until now, when a student's cell errors out, they were on their own to read the traceback and fix it — there was no in-notebook help, even though the rest of the platform (AI tutor, qStudio's Mind Map/Flashcards/Briefing/RAG Q&A) is built around the Multi-AI Gateway.

The gateway already anticipated this: `AITask.CODE` was defined in `backend/ai/models.py` with a placeholder routing order and was already tagged in the expensive per-day rate-limit tier (`AI_RATE_LIMIT_EXPENSIVE_TASKS`) — but per its own comment, "CODE has no dedicated feature today." This feature is CODE's first real caller: a per-cell AI assistant, **QPilot**, that explains a cell's error and/or code on request and can propose a corrected version the student applies with one click.

Scope is deliberately minimal for v1: stateless (no chat history persisted, no Cell/Notebook schema changes), one action per click (no auto-fire on open), and "replace this cell's code" only (no "insert as new cell" — a natural v2 addition once this is validated).

## Design

### Backend

**`backend/ai/config.py`** and **`qstudio_service/ai/config.py`** (kept in sync, same as every other routing table in this package) — `TASK_PROVIDER_ORDER[AITask.CODE]` set explicitly now that CODE has a real caller: Mistral first, then Groq, remaining providers kept in their prior relative order — `["mistral", "groq", "kimi", "gemini", "nvidia", "zai"]`.

**`backend/models/notebook.py`** — three new models alongside `NotebookCell`/`NotebookUpdate`:
```python
class QPilotError(BaseModel):
    ename: str
    evalue: str
    traceback: list[str] = []

class QPilotRequest(BaseModel):
    code: str
    instruction: str
    error: Optional[QPilotError] = None

class QPilotResult(BaseModel):
    explanation: str
    suggested_code: Optional[str] = None   # only set for a concrete whole-cell fix
```

**`backend/routers/qbook_router.py`** — `POST /notebooks/{notebook_id}/qpilot`, following the same structured-output call pattern `qstudio_router.py`'s `_generate_mindmap`/`MINDMAP_SYSTEM_PROMPT` already establish (`ai_gateway.chat(messages=[...], task=AITask.CODE, response_model=QPilotResult, identity=uid)`):
- `QPILOT_SYSTEM_PROMPT` — persona "QPilot": explain root cause in beginner-friendly terms when an error is present; only set `suggested_code` for a concrete whole-cell fix, never a snippet/diff; prefer minimal fixes over rewrites; never invent nonexistent Qiskit/Python APIs.
- `_strip_ansi()` — strips ANSI color codes from `traceback` lines before they reach the LLM prompt (`notebook_service`'s error output includes raw ANSI codes; on-screen rendering in `NotebookCell.tsx` is untouched — this only cleans the LLM's copy).
- Same ownership check every other endpoint in this router uses (`_get_owned_notebook`). `notebook_id` in the path is auth/rate-limit scoping only — nothing is read from the DB beyond the ownership check, since the frontend sends the cell's code/error directly (cells have no standalone backend identity; they only exist embedded in `NotebookOut.cells`).
- No new rate-limit config — `identity=uid` + `task=AITask.CODE` is already covered by the existing expensive-tier daily cap once `AI_RATE_LIMIT_ENABLED` is turned on; `RateLimitExceeded` is already handled globally (`main.py`'s exception handler).

### Frontend

**`frontend/src/modules/qbook/types.ts`** — `QPilotError`, `QPilotRequest`, `QPilotResult`, mirroring the backend models.

**`hooks/useQBookApi.ts`** — `askQPilot(notebookId, request)`, same `run()` wrapper (loading/error state) every other call in this hook uses.

**`components/QPilotPanel.tsx`** (new) — collapsible panel styled consistently with `SourceChatPanel.tsx`'s assistant bubble and `SlidesGenerateForm.tsx`'s button. A one-line instruction input, pre-filled with `"Explain this error and suggest a fix"` when the cell's last output was an error, else an empty `"Ask QPilot about this code…"` placeholder — asking is always an explicit click, never auto-fired on open. Result renders as an explanation bubble plus, if `suggested_code` is present, a read-only code block with a **"Replace cell code"** button. Result state is local-only (no persistence) — cleared on page reload.

**`components/NotebookCell.tsx`** — calls `useQBookApi()` directly (no new prop needed for the ask function itself — `notebookId` is the only new prop threaded in from `QBookEditorPage.tsx`, passed as `notebook.id`). Added to the existing hover toolbar (`Move up / Move down / Convert / Delete`): a `✨ Ask QPilot` toggle (code cells only). `error` for the panel is derived as `cell.outputs.find(o => o.output_type === 'error')`; `onApply` is wired straight to the existing `onChangeSource` prop (that's exactly what it's for) followed by closing the panel.

## Verification

1. Backend: `python -m py_compile backend/models/notebook.py backend/routers/qbook_router.py`, then `python -c "import routers.qbook_router"` from `backend/` with the venv on `PATH`.
2. Frontend: `npx tsc --noEmit -p .` from `frontend/` — zero errors.
3. Manual (local dev stack, `notebook_service` running via Docker): write a cell that throws, run it, click "Ask QPilot", confirm the error is pre-filled and the explanation + suggested fix come back, click "Replace cell code", confirm the editor updates and re-running the cell now succeeds.
