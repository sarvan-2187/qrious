"""Structure-aware chunking. Packs ParsedUnits (paragraphs, already tagged
with page/section by rag/parsing.py) into ~CHUNK_TARGET_CHARS chunks without
ever splitting a paragraph unless that single paragraph alone exceeds the
target — paragraph boundaries are a real structural signal, character counts
alone are not. Each chunk also gets a wider `parent_text` window (surrounding
paragraphs from the same page/section) so retrieval can be precise while
generation still sees enough context to not misread an excerpt.
"""
from dataclasses import dataclass
from typing import List, Optional

from rag.config import CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS, PARENT_WINDOW_CHARS
from rag.parsing import ParsedUnit


@dataclass
class Chunk:
    text: str
    parent_text: str
    page: Optional[int]
    section: Optional[str]
    heading: Optional[str]
    chunk_index: int


def _same_group(a: ParsedUnit, b: ParsedUnit) -> bool:
    return a.page == b.page and a.section == b.section


def _pack_groups(units: List[ParsedUnit]) -> List[List[ParsedUnit]]:
    """Groups consecutive units that share the same (page, section) — chunks
    never span a page/section boundary, so metadata stays unambiguous."""
    groups: List[List[ParsedUnit]] = []
    for unit in units:
        if groups and _same_group(groups[-1][-1], unit):
            groups[-1].append(unit)
        else:
            groups.append([unit])
    return groups


def _pack_target(
    paragraphs: List[str],
    target_chars: int = CHUNK_TARGET_CHARS,
    overlap_chars: int = CHUNK_OVERLAP_CHARS,
) -> List[str]:
    """Greedy paragraph packing with a character-overlap tail carried into the
    next chunk, so a fact split across a chunk boundary is still retrievable
    from either side."""
    chunks: List[str] = []
    current = ""
    for paragraph in paragraphs:
        if not current:
            current = paragraph
        elif len(current) + 2 + len(paragraph) <= target_chars:
            current = f"{current}\n\n{paragraph}"
        else:
            chunks.append(current)
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = f"{tail}\n\n{paragraph}" if tail else paragraph
        # A single paragraph longer than the target is kept whole rather than
        # hard-split mid-sentence — target_chars is a soft budget, not a cap.
    if current:
        chunks.append(current)
    return chunks


def chunk_units(units: List[ParsedUnit]) -> List[Chunk]:
    chunks: List[Chunk] = []
    for group in _pack_groups(units):
        paragraphs = [u.text for u in group]
        packed = _pack_target(paragraphs)
        full_text = "\n\n".join(paragraphs)
        for text in packed:
            # Parent window: expand around this chunk's position within the
            # group's full text, up to PARENT_WINDOW_CHARS, without crossing
            # the page/section boundary the group itself represents.
            start = full_text.find(text.split("\n\n", 1)[-1][:80]) if len(text) > 80 else full_text.find(text)
            if start < 0:
                parent_text = text
            else:
                pad = max(0, (PARENT_WINDOW_CHARS - len(text)) // 2)
                window_start = max(0, start - pad)
                window_end = min(len(full_text), start + len(text) + pad)
                parent_text = full_text[window_start:window_end]
            chunks.append(
                Chunk(
                    text=text,
                    parent_text=parent_text,
                    page=group[0].page,
                    section=group[0].section,
                    heading=group[0].heading,
                    chunk_index=len(chunks),
                )
            )
    return chunks
