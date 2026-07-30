from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from models.lms import MongoBaseModel


class NotebookCell(BaseModel):
    id: str
    cell_type: Literal["code", "markdown"] = "code"
    source: str = ""
    outputs: list[dict] = Field(default_factory=list)  # nbformat-shaped, stored as-is
    execution_count: Optional[int] = None


class NotebookCreate(BaseModel):
    title: str = "Untitled Notebook"


class NotebookUpdate(BaseModel):
    title: Optional[str] = None
    cells: Optional[list[NotebookCell]] = None


class NotebookOut(MongoBaseModel):
    owner_uid: str
    title: str
    cells: list[NotebookCell]
    created_at: datetime
    updated_at: datetime


class NotebookSummary(BaseModel):
    id: str
    title: str
    cell_count: int
    updated_at: datetime


class NotebookSession(BaseModel):
    session_token: str
    expires_in: int


# --- QPilot — qBook's per-cell AI coding assistant (PLANS/qbook-qpilot.md) ---

class QPilotError(BaseModel):
    ename: str
    evalue: str
    traceback: list[str] = Field(default_factory=list)


class QPilotRequest(BaseModel):
    code: str
    instruction: str
    error: Optional[QPilotError] = None


class QPilotResult(BaseModel):
    explanation: str
    # Only set when proposing a concrete corrected/improved version of the
    # WHOLE cell — omitted for pure explanation questions. See
    # QPILOT_SYSTEM_PROMPT in routers/qbook_router.py.
    suggested_code: Optional[str] = None
