"""Legal-aware chunking strategies for Indian-law corpus ingestion."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class ChunkWithMeta:
    text: str
    section_ref: str = ""
    chunk_index: int = 0


# ── Section boundary patterns ────────────────────────────────────────────────

_SECTION_PATTERN = re.compile(
    r'^(?:Section|Sec\.?|§)\s*(\d+[A-Za-z]?)\b',
    re.MULTILINE | re.IGNORECASE,
)

_RULE_PATTERN = re.compile(
    r'^(?:Rule|Regulation)\s*(\d+[A-Za-z]?)\b',
    re.MULTILINE | re.IGNORECASE,
)

_HEADING_PATTERN = re.compile(
    r'^(?:\d+\.?\s+|(?:CHAPTER|PART|SCHEDULE|ARTICLE)\s+)',
    re.MULTILINE | re.IGNORECASE,
)

_PARA_PATTERN = re.compile(
    r'^(?:\d+\.)\s+',
    re.MULTILINE,
)


def chunk_statute(text: str, max_chunk: int = 1200, overlap: int = 100) -> list[ChunkWithMeta]:
    """Chunk bare acts / statutes by section boundaries."""
    return _split_by_pattern(text, _SECTION_PATTERN, max_chunk, overlap, "Section")


def chunk_rule(text: str, max_chunk: int = 1200, overlap: int = 100) -> list[ChunkWithMeta]:
    """Chunk rules/regulations by rule boundaries."""
    return _split_by_pattern(text, _RULE_PATTERN, max_chunk, overlap, "Rule")


def chunk_judgment(text: str, max_chunk: int = 1000, overlap: int = 150) -> list[ChunkWithMeta]:
    """Chunk judgments by paragraph headings."""
    chunks = _split_by_pattern(text, _HEADING_PATTERN, max_chunk, overlap, "Para")
    if len(chunks) <= 1:
        return chunk_fallback(text, max_chunk, overlap)
    return chunks


def chunk_circular(text: str, max_chunk: int = 1000, overlap: int = 100) -> list[ChunkWithMeta]:
    """Chunk circulars by numbered sections."""
    chunks = _split_by_pattern(text, _PARA_PATTERN, max_chunk, overlap, "Clause")
    if len(chunks) <= 1:
        return chunk_fallback(text, max_chunk, overlap)
    return chunks


def chunk_fallback(text: str, max_chunk: int = 800, overlap: int = 120) -> list[ChunkWithMeta]:
    """Overlapping word-window chunking when structure parsing fails."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []

    words = text.split()
    if len(words) <= max_chunk:
        return [ChunkWithMeta(text=text, chunk_index=0)]

    chunks: list[ChunkWithMeta] = []
    start = 0
    idx = 0
    while start < len(words):
        end = min(start + max_chunk, len(words))
        chunk_text = ' '.join(words[start:end])
        if len(chunk_text.strip()) > 50:
            chunks.append(ChunkWithMeta(text=chunk_text, chunk_index=idx))
            idx += 1
        if end == len(words):
            break
        start += max_chunk - overlap

    return chunks


def auto_chunk(text: str, source_type: str) -> list[ChunkWithMeta]:
    """Dispatch to the appropriate chunking strategy based on source type."""
    st = source_type.lower()
    if st == "statute":
        return chunk_statute(text)
    elif st == "rule":
        return chunk_rule(text)
    elif st == "judgment":
        return chunk_judgment(text)
    elif st == "circular":
        return chunk_circular(text)
    else:
        return chunk_fallback(text)


# ── Internal ─────────────────────────────────────────────────────────────────

def _split_by_pattern(
    text: str,
    pattern: re.Pattern,
    max_chunk: int,
    overlap: int,
    ref_prefix: str,
) -> list[ChunkWithMeta]:
    """Split text at regex boundary matches, preserving section references."""
    matches = list(pattern.finditer(text))
    if len(matches) < 2:
        return chunk_fallback(text, max_chunk, overlap)

    chunks: list[ChunkWithMeta] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[start:end].strip()

        ref = match.group(1) if match.lastindex else ""
        section_ref = f"{ref_prefix} {ref}".strip() if ref else f"{ref_prefix} {i + 1}"

        # If the section is too large, sub-chunk it
        if len(section_text.split()) > max_chunk:
            sub_chunks = chunk_fallback(section_text, max_chunk, overlap)
            for j, sc in enumerate(sub_chunks):
                sc.section_ref = f"{section_ref}.{j + 1}" if len(sub_chunks) > 1 else section_ref
                sc.chunk_index = len(chunks)
                chunks.append(sc)
        else:
            chunks.append(ChunkWithMeta(
                text=section_text,
                section_ref=section_ref,
                chunk_index=len(chunks),
            ))

    return chunks
