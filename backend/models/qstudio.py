from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from models.lms import MongoBaseModel

OutputType = Literal[
    "video", "audio", "mindmap", "flashcards", "briefing", "study_guide", "blog_post", "slides", "animation",
]
SourceKind = Literal["pdf", "text"]


class StudySpaceCreate(BaseModel):
    title: str = "Untitled Study Space"


class StudySpaceUpdate(BaseModel):
    title: str


class StudySpaceOut(MongoBaseModel):
    owner_uid: str
    title: str
    created_at: datetime
    updated_at: datetime


class StudySpaceSummary(BaseModel):
    id: str
    title: str
    source_count: int
    output_count: int
    updated_at: datetime


class SourceCreate(BaseModel):
    kind: SourceKind
    filename: Optional[str] = None       # required if kind == "pdf"
    content_type: Optional[str] = None   # required if kind == "pdf"
    size_bytes: Optional[int] = None     # required if kind == "pdf"
    text: Optional[str] = None           # required if kind == "text"


class SourceUploadUrlResponse(BaseModel):
    upload_url: str
    source_id: str


class SourceOut(MongoBaseModel):
    study_space_id: str
    owner_uid: str
    kind: SourceKind
    filename: Optional[str] = None
    status: Literal["pending", "confirmed"]
    created_at: datetime
    # RAG indexing state — separate from `status` above (which only tracks the
    # PDF-upload-confirmation / grounding-text-extraction flow every output
    # generator already relies on). See PLANS/qstudio-rag.md §2.
    rag_status: Literal["not_indexed", "processing", "ready", "failed"] = "not_indexed"
    rag_error: Optional[str] = None
    chunk_count: int = 0


class OutputCreate(BaseModel):
    type: OutputType
    params: dict = Field(default_factory=dict)


class OutputOut(MongoBaseModel):
    # Optional because qCompare (routers/qroute_router.py) creates audio/animation
    # outputs that aren't scoped to any qStudio study space — everything else that
    # creates a qstudio_outputs doc (create_output) still always sets a real one.
    study_space_id: Optional[str] = None
    owner_uid: str
    type: OutputType
    params: dict
    status: str
    error: Optional[str] = None
    result: dict
    created_at: datetime
    updated_at: datetime
    # Set only on qCompare-triggered outputs — links back to the QRoute job this
    # audio/animation narration explains. None for every ordinary qStudio output.
    qcompare_job_id: Optional[str] = None


class FlashcardReviewRequest(BaseModel):
    recall_rating: Literal[1, 2, 3, 4]


# --- Mind Map generation schema (Groq structured output) ---

class MindMapNode(BaseModel):
    label: str
    children: List["MindMapNode"] = Field(default_factory=list, max_length=6)


MindMapNode.model_rebuild()


class MindMapResult(BaseModel):
    root: MindMapNode


# --- Flashcards generation schema (Groq structured output) ---

class GeneratedFlashcard(BaseModel):
    """Shape the LLM fills in — no id yet, assigned server-side on persist."""
    front: str
    back: str


class FlashcardsResult(BaseModel):
    cards: List[GeneratedFlashcard] = Field(min_length=8, max_length=20)


# --- Briefing Doc generation schema (Groq structured output) ---

class BriefingTopic(BaseModel):
    title: str
    summary: str


class GlossaryTerm(BaseModel):
    term: str
    definition: str


class BriefingResult(BaseModel):
    overview: str
    key_topics: List[BriefingTopic] = Field(max_length=8)
    glossary: List[GlossaryTerm] = Field(max_length=12)


# --- Study Guide generation schema (Groq structured output) ---

class StudyGuideQuestion(BaseModel):
    question: str
    answer: str


class StudyGuideResult(BaseModel):
    short_answer_questions: List[StudyGuideQuestion] = Field(max_length=10)
    # Prompts only, no model answers — meant to encourage the student's own
    # synthesis/reasoning, not to be graded against a key.
    essay_questions: List[str] = Field(max_length=6)
    glossary: List[GlossaryTerm] = Field(max_length=12)


# --- Blog Post generation schema (Groq structured output) ---

class BlogSection(BaseModel):
    heading: str
    body: str


class BlogPostResult(BaseModel):
    title: str
    intro: str
    sections: List[BlogSection] = Field(max_length=6)
    conclusion: str
