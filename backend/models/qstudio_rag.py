from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from models.lms import MongoBaseModel

SourceRagStatus = Literal["not_indexed", "processing", "ready", "failed"]


class RagCitation(BaseModel):
    citation_id: str
    source_id: str
    source_name: str
    page: Optional[int] = None
    section: Optional[str] = None
    chunk_id: str
    snippet: str


# --- LLM structured-output schema (ai_gateway.chat(response_model=...)) ---

class RagAnswer(BaseModel):
    answer: str
    # Citation IDs (e.g. "S1", "S2") the model chose to support its claims —
    # cross-checked against the context manifest server-side; any ID the model
    # invents that isn't in the manifest is dropped before the response goes
    # to the frontend (see rag/pipeline.py::answer_question).
    citations: List[str] = Field(default_factory=list)
    insufficient_evidence: bool = False


class RagQueryRequest(BaseModel):
    question: str
    # None (or omitted) means "search every confirmed source in the study
    # space" — matches the rest of qStudio's "no explicit selection means
    # everything" convention (see _get_grounding_text).
    source_ids: Optional[List[str]] = None


class RagRetrievalMeta(BaseModel):
    chunks_used: int
    retrieval_ms: float
    rerank_ms: float
    generation_ms: float
    total_ms: float


class RagQueryResponse(BaseModel):
    answer: str
    insufficient_evidence: bool
    citations: List[RagCitation]
    retrieval: RagRetrievalMeta


class RagMessageOut(MongoBaseModel):
    study_space_id: str
    owner_uid: str
    role: Literal["user", "assistant"]
    content: str
    citations: List[RagCitation] = Field(default_factory=list)
    created_at: datetime


class SourceRagStatusOut(BaseModel):
    rag_status: SourceRagStatus
    rag_error: Optional[str] = None
    chunk_count: int = 0
