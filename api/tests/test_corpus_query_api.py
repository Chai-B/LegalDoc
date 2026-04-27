"""Tests for the corpus query API endpoint."""
import sys
import os
import unittest
from unittest.mock import patch, AsyncMock

# Add api/ to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import CorpusChunk, ChunkResult
from schemas import ConfidenceLevel, Citation


class TestCorpusQuerySchemas(unittest.TestCase):
    """Test schema validation and construction."""

    def test_citation_construction(self):
        c = Citation(title="IT Act", source_type="statute", authority="Parliament")
        self.assertEqual(c.title, "IT Act")

    def test_confidence_levels(self):
        self.assertEqual(ConfidenceLevel.HIGH.value, "high")
        self.assertEqual(ConfidenceLevel.MEDIUM.value, "medium")
        self.assertEqual(ConfidenceLevel.LOW.value, "low")


class TestChunkResultToCitation(unittest.TestCase):
    """Test converting ChunkResults into Citation objects."""

    def test_conversion(self):
        chunk = CorpusChunk(chunk_id="c1", doc_id="d1", text="test", section_ref="Section 5")
        result = ChunkResult(
            chunk=chunk, score=0.9, source="corpus",
            doc_title="Indian Contract Act",
            doc_source_type="statute",
            doc_authority="Parliament of India",
            doc_citation="Act No. 9 of 1872",
            doc_section_ref="Section 5",
            doc_source_url="https://example.com",
        )
        citation = Citation(
            title=result.doc_title,
            source_type=result.doc_source_type,
            authority=result.doc_authority,
            citation_ref=result.doc_citation,
            section_ref=result.doc_section_ref,
            source_url=result.doc_source_url,
        )
        self.assertEqual(citation.title, "Indian Contract Act")
        self.assertEqual(citation.source_type, "statute")


class TestLegalChunking(unittest.TestCase):
    """Test legal-aware chunking strategies."""

    def test_statute_chunking(self):
        from services.legal_chunking import chunk_statute
        text = """
Section 1 Introduction to the Act
This is the first section of the act with significant content that establishes the jurisdiction.

Section 2 Definitions for the Act
In this Act, the following definitions apply to all agreements under Indian contract law.

Section 3 Communication of Proposals
The communication of proposals is complete when the proposal comes to the knowledge.
"""
        chunks = chunk_statute(text)
        self.assertGreater(len(chunks), 1)
        self.assertIn("Section", chunks[0].section_ref)

    def test_fallback_chunking(self):
        from services.legal_chunking import chunk_fallback
        text = "word " * 2000
        chunks = chunk_fallback(text, max_chunk=500)
        self.assertGreater(len(chunks), 1)

    def test_auto_chunk_dispatch(self):
        from services.legal_chunking import auto_chunk
        text = "Some text " * 500
        chunks = auto_chunk(text, "statute")
        self.assertGreater(len(chunks), 0)


if __name__ == "__main__":
    unittest.main()
