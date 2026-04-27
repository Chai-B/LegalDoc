"""Pydantic schemas for the Indian-law RAG API."""
from __future__ import annotations

import enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Confidence ───────────────────────────────────────────────────────────────

class ConfidenceLevel(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ── Citations ────────────────────────────────────────────────────────────────

class Citation(BaseModel):
    title: str
    source_type: str = ""
    authority: str = ""
    citation_ref: str = ""
    section_ref: str = ""
    source_url: str = ""


# ── Corpus Query ─────────────────────────────────────────────────────────────

class CorpusQueryRequest(BaseModel):
    question: str = Field(..., min_length=5)
    document_text: Optional[str] = None
    retrieval_mode: str = "hybrid"  # "hybrid" | "vector" | "keyword"


class CorpusQueryResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    confidence: ConfidenceLevel = ConfidenceLevel.LOW
    document_findings: Optional[str] = None
    legal_context: Optional[str] = None


# ── Extended tool responses ──────────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    result: str
    citations: list[Citation] = []
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM


class RiskAnalysisResponse(BaseModel):
    result: str
    score: int = 50
    citations: list[Citation] = []
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
