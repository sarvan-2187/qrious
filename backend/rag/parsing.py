"""Structure-aware source parsing — turns raw source text into a flat list of
paragraph-level ParsedUnits tagged with whatever structural metadata the
source kind actually offers (page number for PDF, heading/section for
markdown-ish text). Deliberately doesn't invent structure that isn't there:
pypdf's plain-text extraction has no heading signal, so PDF units only carry
page numbers, never a fake "heading" guess.
"""
import io
import re
from dataclasses import dataclass
from typing import List, Optional

from pypdf import PdfReader

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_BLANK_LINE_RE = re.compile(r"\n\s*\n+")


@dataclass
class ParsedUnit:
    text: str
    page: Optional[int] = None
    section: Optional[str] = None
    heading: Optional[str] = None


def _split_paragraphs(text: str) -> List[str]:
    return [p.strip() for p in _BLANK_LINE_RE.split(text) if p.strip()]


def parse_pdf_bytes(pdf_bytes: bytes) -> List[ParsedUnit]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    units: List[ParsedUnit] = []
    for page_index, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        for paragraph in _split_paragraphs(page_text):
            units.append(ParsedUnit(text=paragraph, page=page_index))
    return units


def parse_text(text: str) -> List[ParsedUnit]:
    """Markdown-heading-aware: lines starting with `#`..`######` open a new
    section that every following paragraph is tagged with, until the next
    heading. Plain text with no headings just becomes one untitled section."""
    units: List[ParsedUnit] = []
    current_section: Optional[str] = None
    current_heading: Optional[str] = None
    buffer_lines: List[str] = []

    def flush():
        block = "\n".join(buffer_lines)
        for paragraph in _split_paragraphs(block):
            units.append(ParsedUnit(text=paragraph, section=current_section, heading=current_heading))
        buffer_lines.clear()

    for line in text.splitlines():
        match = _HEADING_RE.match(line.strip())
        if match:
            flush()
            current_heading = match.group(2).strip()
            current_section = current_heading
        else:
            buffer_lines.append(line)
    flush()
    return units


def parse_source(kind: str, filename: Optional[str], raw_text: Optional[str], raw_bytes: Optional[bytes]) -> List[ParsedUnit]:
    """Dispatch by SourceKind. `pdf` sources are already extracted to plain
    text once (qstudio_router._extract_pdf_text) for the existing grounding-
    text path — indexing re-parses the same PDF bytes from B2 rather than the
    flattened extracted_text so page boundaries survive; callers that already
    have raw_text (text sources) skip straight to parse_text."""
    if kind == "pdf":
        if raw_bytes is None:
            raise ValueError("parse_source(kind='pdf') requires raw_bytes")
        return parse_pdf_bytes(raw_bytes)
    if kind == "text":
        if raw_text is None:
            raise ValueError("parse_source(kind='text') requires raw_text")
        return parse_text(raw_text)
    raise ValueError(f"Unsupported source kind for RAG indexing: {kind!r}")
