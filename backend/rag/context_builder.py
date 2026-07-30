"""Turns a ranked list of chunk docs into the actual text handed to the LLM,
plus the citation manifest it's allowed to reference. Two things this
deliberately does that naive concatenation wouldn't: merges chunks that are
adjacent within the same source (avoids near-duplicate, choppy context from
two neighboring chunks of the same paragraph both scoring high), and expands
each surviving chunk to its `parent_text` window so the model sees enough
surrounding material to not misread an excerpt.
"""
from dataclasses import dataclass
from typing import Dict, List, Tuple

from models.qstudio_rag import RagCitation
from rag.config import CONTEXT_MAX_CHARS


@dataclass
class RankedChunk:
    chunk_id: str
    source_id: str
    document_name: str
    page: int | None
    section: str | None
    chunk_index: int
    text: str
    parent_text: str
    score: float


def _merge_adjacent(chunks: List[RankedChunk]) -> List[RankedChunk]:
    """Best-first input. Chunks from the same source whose chunk_index differs
    by 1 are folded into the higher-ranked one's parent_text (the lower-ranked
    duplicate is dropped, not the higher-ranked one — its rank/score stands)."""
    kept: List[RankedChunk] = []
    seen_keys = set()
    for chunk in chunks:
        merged = False
        for existing in kept:
            if existing.source_id == chunk.source_id and abs(existing.chunk_index - chunk.chunk_index) <= 1:
                if chunk.parent_text not in existing.parent_text:
                    existing.parent_text = f"{existing.parent_text}\n\n{chunk.parent_text}"
                merged = True
                break
        if not merged:
            key = (chunk.source_id, chunk.chunk_index)
            if key not in seen_keys:
                seen_keys.add(key)
                kept.append(chunk)
    return kept


def build_context(chunks: List[RankedChunk]) -> Tuple[str, Dict[str, RagCitation]]:
    """`chunks` must already be ranked best-first. Returns (context_text,
    {citation_id: RagCitation}) — citation IDs are assigned in rank order so
    S1 is always the strongest piece of evidence."""
    merged = _merge_adjacent(chunks)

    blocks: List[str] = []
    manifest: Dict[str, RagCitation] = {}
    budget = CONTEXT_MAX_CHARS
    for i, chunk in enumerate(merged, start=1):
        citation_id = f"S{i}"
        page_part = f" | PAGE: {chunk.page}" if chunk.page is not None else ""
        section_part = f" | SECTION: {chunk.section}" if chunk.section else ""
        header = f"[SOURCE: {chunk.document_name}{page_part}{section_part} | CHUNK: {citation_id}]"
        block = f"{header}\n{chunk.parent_text}"

        if blocks and len(block) > budget:
            # Keep at least one block even if it blows the budget — an empty
            # context is worse than one over-length piece of evidence.
            break
        blocks.append(block)
        budget -= len(block)

        snippet = chunk.text[:280] + ("…" if len(chunk.text) > 280 else "")
        manifest[citation_id] = RagCitation(
            citation_id=citation_id,
            source_id=chunk.source_id,
            source_name=chunk.document_name,
            page=chunk.page,
            section=chunk.section,
            chunk_id=chunk.chunk_id,
            snippet=snippet,
        )

    return "\n\n---\n\n".join(blocks), manifest
