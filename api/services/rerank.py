"""Reranking and confidence scoring for retrieval results."""
from __future__ import annotations

from collections import defaultdict
from typing import Sequence

from models import ChunkResult
from schemas import ConfidenceLevel


def reciprocal_rank_fusion(
    result_lists: Sequence[list[ChunkResult]],
    k: int = 60,
) -> list[ChunkResult]:
    """Merge multiple ranked result lists using Reciprocal Rank Fusion.

    RRF score = sum over lists of 1 / (k + rank), where rank is 1-indexed.
    Higher k dampens the effect of high-ranking results.
    """
    scores: dict[str, float] = defaultdict(float)
    best_result: dict[str, ChunkResult] = {}

    for result_list in result_lists:
        for rank, result in enumerate(result_list, start=1):
            cid = result.chunk.chunk_id
            scores[cid] += 1.0 / (k + rank)
            if cid not in best_result or result.score > best_result[cid].score:
                best_result[cid] = result

    fused = []
    for cid, rrf_score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        r = best_result[cid]
        fused.append(ChunkResult(
            chunk=r.chunk,
            score=rrf_score,
            source=r.source,
            doc_title=r.doc_title,
            doc_source_type=r.doc_source_type,
            doc_authority=r.doc_authority,
            doc_citation=r.doc_citation,
            doc_section_ref=r.doc_section_ref,
            doc_source_url=r.doc_source_url,
        ))

    return fused


def score_confidence(results: list[ChunkResult]) -> ConfidenceLevel:
    """Estimate confidence from retrieval results.

    Factors: top score strength, source count, source-type diversity.
    """
    if not results:
        return ConfidenceLevel.LOW

    top_score = results[0].score if results else 0.0
    source_types = {r.doc_source_type for r in results[:5] if r.doc_source_type}
    source_count = len(results)

    # Rough calibration — will be tuned with real data
    if top_score > 0.02 and source_count >= 3 and len(source_types) >= 2:
        return ConfidenceLevel.HIGH
    elif top_score > 0.01 and source_count >= 2:
        return ConfidenceLevel.MEDIUM
    else:
        return ConfidenceLevel.LOW
