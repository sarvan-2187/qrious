from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class QuantumNewsArticle(BaseModel):
    source: str = Field(..., description="Source name: arxiv, qiskit, physorg")
    category: str = Field(..., description="Category: hardware, software, research, breakthrough")
    title: str
    url: str
    published_at: datetime
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_summary: str
    audience_tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None

class QuantumNewsArticleOut(BaseModel):
    id: str
    source: str
    category: str
    title: str
    url: str
    published_at: datetime
    fetched_at: datetime
    raw_summary: str
    audience_tags: List[str] = []
    image_url: Optional[str] = None
