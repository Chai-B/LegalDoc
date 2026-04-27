"""Domain models for the Indian-law corpus."""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date
from typing import Optional, List


class SourceType(str, enum.Enum):
    STATUTE = "statute"
    RULE = "rule"
    JUDGMENT = "judgment"
    CIRCULAR = "circular"


@dataclass(frozen=True)
class CorpusDocument:
    doc_id: str
    title: str
    source_type: SourceType
    authority: str = ""
    citation: str = ""
    source_url: str = ""
    published_at: Optional[date] = None
    jurisdiction: str = "India"


@dataclass(frozen=True)
class CorpusChunk:
    chunk_id: str
    doc_id: str
    text: str
    section_ref: str = ""
    chunk_index: int = 0
    embedding: Optional[List[float]] = field(default=None, repr=False)


@dataclass
class ChunkResult:
    """A retrieval result — chunk + score + provenance."""
    chunk: CorpusChunk
    score: float = 0.0
    source: str = "corpus"  # "corpus" | "ephemeral"

    # Denormalized metadata for citation rendering
    doc_title: str = ""
    doc_source_type: str = ""
    doc_authority: str = ""
    doc_citation: str = ""
    doc_section_ref: str = ""
    doc_source_url: str = ""
