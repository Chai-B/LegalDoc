"""Tests for retrieval and reranking logic."""
import sys
import os
import unittest
from unittest.mock import patch, AsyncMock, MagicMock

# Add api/ to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import CorpusChunk, ChunkResult
from schemas import ConfidenceLevel
from services.rerank import reciprocal_rank_fusion, score_confidence


class TestReciprocalRankFusion(unittest.TestCase):

    def _make_result(self, cid: str, score: float, source: str = "corpus") -> ChunkResult:
        chunk = CorpusChunk(chunk_id=cid, doc_id="d1", text=f"text-{cid}")
        return ChunkResult(chunk=chunk, score=score, source=source)

    def test_single_list(self):
        results = [self._make_result("a", 0.9), self._make_result("b", 0.7)]
        fused = reciprocal_rank_fusion([results])
        self.assertEqual(len(fused), 2)
        self.assertEqual(fused[0].chunk.chunk_id, "a")

    def test_two_lists_fusion(self):
        list_a = [self._make_result("a", 0.9), self._make_result("b", 0.7)]
        list_b = [self._make_result("b", 0.8), self._make_result("c", 0.6)]
        fused = reciprocal_rank_fusion([list_a, list_b])
        cids = [r.chunk.chunk_id for r in fused]
        # "b" appears in both lists so should rank higher
        self.assertIn("b", cids)
        self.assertEqual(cids[0], "b")

    def test_empty_lists(self):
        fused = reciprocal_rank_fusion([[], []])
        self.assertEqual(fused, [])

    def test_preserves_metadata(self):
        chunk = CorpusChunk(chunk_id="x", doc_id="d1", text="test")
        result = ChunkResult(
            chunk=chunk, score=0.9, source="corpus",
            doc_title="Test Act", doc_source_type="statute",
        )
        fused = reciprocal_rank_fusion([[result]])
        self.assertEqual(fused[0].doc_title, "Test Act")


class TestConfidenceScoring(unittest.TestCase):

    def _make_result(self, score: float, source_type: str = "statute") -> ChunkResult:
        chunk = CorpusChunk(chunk_id="c1", doc_id="d1", text="text")
        return ChunkResult(chunk=chunk, score=score, doc_source_type=source_type)

    def test_empty_results_low(self):
        self.assertEqual(score_confidence([]), ConfidenceLevel.LOW)

    def test_weak_score_low(self):
        results = [self._make_result(0.005)]
        self.assertEqual(score_confidence(results), ConfidenceLevel.LOW)

    def test_medium_confidence(self):
        results = [self._make_result(0.015), self._make_result(0.012)]
        self.assertEqual(score_confidence(results), ConfidenceLevel.MEDIUM)

    def test_high_confidence(self):
        results = [
            self._make_result(0.025, "statute"),
            self._make_result(0.02, "judgment"),
            self._make_result(0.018, "circular"),
        ]
        self.assertEqual(score_confidence(results), ConfidenceLevel.HIGH)


class TestEphemeralSearch(unittest.TestCase):

    def test_basic_retrieval(self):
        from services.retrieval import ephemeral_search
        doc = (
            "Section 1: The contractor shall deliver goods within 30 business days of the order. "
            "The goods must meet quality standards as specified in Annex A. "
            "Section 2: Payment terms are net 30 days from invoice date. "
            "Late payment attracts interest at 12 percent per annum. "
            "Section 3: Either party may terminate this agreement with 60 days written notice. "
            "Termination does not affect obligations accrued before the termination date. "
            "Section 4: All intellectual property created during the engagement shall vest with the client. "
            "The contractor grants a perpetual license for any pre-existing IP incorporated into deliverables. "
            "Section 5: The contractor shall indemnify the client against all third party claims. "
            "The total liability under this agreement shall not exceed the contract value. "
        ) * 5
        results = ephemeral_search(doc, "payment terms", top_k=3)
        self.assertGreater(len(results), 0)
        self.assertEqual(results[0].source, "ephemeral")

    def test_empty_document(self):
        from services.retrieval import ephemeral_search
        results = ephemeral_search("", "test query")
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()
