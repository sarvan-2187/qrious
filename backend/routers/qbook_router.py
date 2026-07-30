import os
import re
import time
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

import jwt
import nbformat
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status

from ai import ai_gateway, AITask, ChatMessage
from auth import get_current_user
from database import get_db
from models.lms import serialize
from models.notebook import (
    NotebookCreate,
    NotebookOut,
    NotebookSession,
    NotebookSummary,
    NotebookUpdate,
    QPilotRequest,
    QPilotResult,
)
from services.qbook_pdf import render_notebook_pdf

router = APIRouter(prefix="/api/v1/qbook", tags=["qBook"])

QBOOK_SERVICE_SECRET = os.getenv("QBOOK_SERVICE_SECRET")
SESSION_TOKEN_TTL_SECONDS = 60 * 60  # 1 hour

STARTER_CELLS = [
    {
        "id": str(uuid.uuid4()),
        "cell_type": "markdown",
        "source": "## Welcome to qBook\nRun Python, explore Qiskit, and everything in between.",
        "outputs": [],
        "execution_count": None,
    },
    {
        "id": str(uuid.uuid4()),
        "cell_type": "code",
        "source": "import qiskit\nprint(qiskit.__version__)",
        "outputs": [],
        "execution_count": None,
    },
]


QPILOT_SYSTEM_PROMPT = (
    "You are QPilot, a coding assistant embedded in qBook, a Qiskit/Python "
    "learning notebook. You are given a cell's code, optionally its most "
    "recent execution error, and the user's question or instruction.\n\n"
    "Rules:\n"
    "1. If an error is present, explain its root cause first, in plain, "
    "beginner-friendly terms — assume the reader is learning Qiskit/Python, "
    "not an expert.\n"
    "2. Only fill `suggested_code` when you are proposing a concrete, "
    "corrected version of the ENTIRE cell (not a snippet or diff) — leave it "
    "null for pure explanation questions with no code change to offer.\n"
    "3. Prefer the smallest change that fixes the stated problem over a "
    "rewrite — keep the student's original approach/style where possible.\n"
    "4. If there's no error and no clear question, explain what the code "
    "does.\n"
    "5. Never invent a Qiskit or Python API that doesn't exist."
)

_ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    """notebook_service's error tracebacks include raw ANSI color codes
    (ipykernel's default) — stripped only for the LLM's copy; on-screen
    rendering in NotebookCell.tsx is untouched."""
    return _ANSI_ESCAPE_RE.sub("", text)


async def _get_owned_notebook(db, notebook_id: str, uid: str) -> dict:
    if not ObjectId.is_valid(notebook_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    doc = await db.notebooks.find_one({"_id": ObjectId(notebook_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")
    if doc["owner_uid"] != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your notebook")
    return doc


@router.get("/notebooks", response_model=list[NotebookSummary])
async def list_notebooks(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.notebooks.find({"owner_uid": current_user["firebase_uid"]}).sort("updated_at", -1)
    return [
        NotebookSummary(
            id=str(doc["_id"]),
            title=doc["title"],
            cell_count=len(doc.get("cells", [])),
            updated_at=doc["updated_at"],
        )
        async for doc in cursor
    ]


@router.post("/notebooks", response_model=NotebookOut, status_code=status.HTTP_201_CREATED)
async def create_notebook(request: NotebookCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_uid": current_user["firebase_uid"],
        "title": request.title,
        "cells": STARTER_CELLS,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.notebooks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc, NotebookOut)


@router.get("/notebooks/{notebook_id}", response_model=NotebookOut)
async def get_notebook(notebook_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])
    return serialize(doc, NotebookOut)


@router.patch("/notebooks/{notebook_id}", response_model=NotebookOut)
async def update_notebook(
    notebook_id: str, request: NotebookUpdate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])

    update_fields: dict = {"updated_at": datetime.now(timezone.utc)}
    if request.title is not None:
        update_fields["title"] = request.title
    if request.cells is not None:
        update_fields["cells"] = [cell.model_dump() for cell in request.cells]

    await db.notebooks.update_one({"_id": doc["_id"]}, {"$set": update_fields})
    doc.update(update_fields)
    return serialize(doc, NotebookOut)


@router.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(notebook_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])
    await db.notebooks.delete_one({"_id": doc["_id"]})


@router.post("/notebooks/{notebook_id}/session", response_model=NotebookSession)
async def create_session(notebook_id: str, current_user: dict = Depends(get_current_user)):
    if not QBOOK_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="qBook's notebook service isn't configured on this deployment.",
        )
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])

    payload = {
        "uid": current_user["firebase_uid"],
        "notebook_id": str(doc["_id"]),
        "exp": int(time.time()) + SESSION_TOKEN_TTL_SECONDS,
    }
    token = jwt.encode(payload, QBOOK_SERVICE_SECRET, algorithm="HS256")

    return NotebookSession(session_token=token, expires_in=SESSION_TOKEN_TTL_SECONDS)


@router.post("/notebooks/{notebook_id}/qpilot", response_model=QPilotResult)
async def ask_qpilot(notebook_id: str, request: QPilotRequest, current_user: dict = Depends(get_current_user)):
    """QPilot — a per-cell AI coding assistant (PLANS/qbook-qpilot.md).
    Stateless: nothing here is persisted, `notebook_id` is only for the
    ownership/rate-limit scoping check below — the cell's code/error is sent
    directly in the request body since cells have no standalone backend
    identity of their own (they only exist as NotebookOut.cells)."""
    db = get_db()
    uid = current_user["firebase_uid"]
    await _get_owned_notebook(db, notebook_id, uid)

    user_content = f"Cell code:\n```python\n{request.code}\n```"
    if request.error:
        traceback_text = _strip_ansi("\n".join(request.error.traceback))
        user_content += (
            f"\n\nThis cell raised an error when run:\n{request.error.ename}: {request.error.evalue}"
            f"\n{traceback_text}"
        )
    user_content += f"\n\nInstruction: {request.instruction}"

    messages = [
        ChatMessage(role="system", content=QPILOT_SYSTEM_PROMPT),
        ChatMessage(role="user", content=user_content),
    ]
    response = await ai_gateway.chat(messages=messages, task=AITask.CODE, response_model=QPilotResult, identity=uid)
    result: QPilotResult = response.parsed
    return result


def _nbformat_safe_outputs(outputs: list) -> list:
    """Two separate nbformat gotchas patched here, both live-reproduced:

    1. Schema validation (inside new_code_cell()) requires a `metadata` field on
       execute_result/display_data outputs. notebook_service didn't set one until
       this was found — fixed there for outputs generated going forward, but
       notebooks that already ran cells before that fix have outputs saved
       without it, so it's backfilled here too rather than requiring a re-run.
    2. nbformat.writes() itself (not validation — a separate code path,
       nbformat.v4.rwbase.split_lines) accesses `output.output_type` and
       `output.text` via attribute syntax, not dict indexing — it expects
       NotebookNode objects, and raises AttributeError on plain dicts (which is
       exactly what MongoDB hands back). NotebookNode is a dict subclass with
       attribute access, so wrapping is enough; the nested `data` mimebundle
       stays a plain dict since only top-level output access uses attributes.
    """
    safe = []
    for output in outputs:
        if output.get("output_type") in ("execute_result", "display_data") and "metadata" not in output:
            output = {**output, "metadata": {}}
        safe.append(nbformat.NotebookNode(output))
    return safe


def _content_disposition(title: str, extension: str) -> str:
    """HTTP header values must be latin-1 encodable — a title with an emoji, most
    non-Latin scripts, or even a literal `"` broke this outright (Starlette raises
    UnicodeEncodeError building the Response, which the browser sees as a dead
    connection rather than a real error). RFC 5987/6266's filename* gives modern
    browsers the real UTF-8 name; the quoted filename= is a plain-ASCII fallback
    for older clients, with quotes/backslashes stripped so it can't break the
    quoted-string syntax either.
    """
    ascii_title = title.encode("ascii", "ignore").decode("ascii").replace('"', "").replace("\\", "").strip()
    ascii_title = ascii_title or "notebook"
    utf8_title = quote(title)
    return (
        f'attachment; filename="{ascii_title}.{extension}"; '
        f"filename*=UTF-8''{utf8_title}.{extension}"
    )


@router.get("/notebooks/{notebook_id}/export")
async def export_notebook(notebook_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])

    nb = nbformat.v4.new_notebook()
    for cell in doc.get("cells", []):
        if cell["cell_type"] == "markdown":
            nb.cells.append(nbformat.v4.new_markdown_cell(cell["source"]))
        else:
            nb.cells.append(
                nbformat.v4.new_code_cell(
                    cell["source"],
                    outputs=_nbformat_safe_outputs(cell.get("outputs", [])),
                    execution_count=cell.get("execution_count"),
                )
            )

    return Response(
        content=nbformat.writes(nb),
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": _content_disposition(doc["title"], "ipynb")},
    )


@router.get("/notebooks/{notebook_id}/export/pdf")
async def export_notebook_pdf(notebook_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await _get_owned_notebook(db, notebook_id, current_user["firebase_uid"])

    pdf_bytes = render_notebook_pdf(doc)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(doc["title"], "pdf")},
    )
