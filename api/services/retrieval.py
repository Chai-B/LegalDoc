"""Retrieval service — vector, keyword, hybrid, ephemeral, and merged search."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Optional

from models import CorpusChunk, ChunkResult
from schemas import ConfidenceLevel

logger = logging.getLogger(__name__)


# ── Vector search (pgvector) ─────────────────────────────────────────────────

async def vector_search(query: str, top_k: int = 8) -> list[ChunkResult]:
    """Semantic nearest-neighbor search over persisted corpus chunks."""
    from services.embeddings import embed_text

    query_embedding = await embed_text(query)
    if query_embedding is None:
        logger.warning("Embedding service unavailable — skipping vector search")
        return []

    try:
        from db import get_connection
        embedding_str = f"[{','.join(str(v) for v in query_embedding)}]"

        async with get_connection() as conn:
            result = await conn.execute(
                """
                SELECT c.chunk_id, c.doc_id, c.text, c.section_ref, c.chunk_index,
                       d.title, d.source_type, d.authority, d.citation, d.source_url,
                       1 - (c.embedding <=> %s::vector) AS similarity
                FROM corpus_chunks c
                JOIN corpus_documents d ON c.doc_id = d.doc_id
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s
                """,
                (embedding_str, embedding_str, top_k),
            )
            rows = await result.fetchall()
            return [
                ChunkResult(
                    chunk=CorpusChunk(
                        chunk_id=r[0], doc_id=r[1], text=r[2],
                        section_ref=r[3], chunk_index=r[4],
                    ),
                    score=float(r[10]),
                    source="corpus",
                    doc_title=r[5],
                    doc_source_type=r[6],
                    doc_authority=r[7],
                    doc_citation=r[8],
                    doc_source_url=r[9],
                )
                for r in rows
            ]
    except Exception as e:
        logger.warning(f"Vector search failed: {e}")
        return []


# ── Keyword search (SQL full-text) ───────────────────────────────────────────

async def keyword_search(query: str, top_k: int = 8) -> list[ChunkResult]:
    """Lexical search over persisted corpus using PostgreSQL ts_rank."""
    try:
        from db import get_connection

        # Convert query to tsquery-safe form
        terms = re.sub(r'[^\w\s]', ' ', query).split()
        tsquery = " & ".join(t for t in terms if len(t) > 2)
        if not tsquery:
            return []

        async with get_connection() as conn:
            result = await conn.execute(
                """
                SELECT c.chunk_id, c.doc_id, c.text, c.section_ref, c.chunk_index,
                       d.title, d.source_type, d.authority, d.citation, d.source_url,
                       ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', %s)) AS rank
                FROM corpus_chunks c
                JOIN corpus_documents d ON c.doc_id = d.doc_id
                WHERE to_tsvector('english', c.text) @@ plainto_tsquery('english', %s)
                ORDER BY rank DESC
                LIMIT %s
                """,
                (query, query, top_k),
            )
            rows = await result.fetchall()
            return [
                ChunkResult(
                    chunk=CorpusChunk(
                        chunk_id=r[0], doc_id=r[1], text=r[2],
                        section_ref=r[3], chunk_index=r[4],
                    ),
                    score=float(r[10]),
                    source="corpus",
                    doc_title=r[5],
                    doc_source_type=r[6],
                    doc_authority=r[7],
                    doc_citation=r[8],
                    doc_source_url=r[9],
                )
                for r in rows
            ]
    except Exception as e:
        logger.warning(f"Keyword search failed: {e}")
        return []


# ── Hybrid search ────────────────────────────────────────────────────────────

async def hybrid_search(query: str, top_k: int = 8) -> list[ChunkResult]:
    """Combined vector + keyword search with RRF fusion."""
    from services.rerank import reciprocal_rank_fusion

    vec_results = await vector_search(query, top_k=top_k)
    kw_results = await keyword_search(query, top_k=top_k)

    if not vec_results and not kw_results:
        return []

    fused = reciprocal_rank_fusion([vec_results, kw_results])
    return fused[:top_k]


# ── Ephemeral document search (in-memory BM25) ──────────────────────────────

def ephemeral_search(document_text: str, query: str, top_k: int = 5) -> list[ChunkResult]:
    """In-memory BM25 retrieval over an ephemeral user document."""
    from services.rag import chunk_text, tokenize

    # Use smaller chunks for better BM25 discrimination
    chunks = chunk_text(document_text, chunk_size=200, overlap=40)
    if not chunks:
        return []

    try:
        from rank_bm25 import BM25Okapi
        tokenized = [tokenize(c) for c in chunks]
        bm25 = BM25Okapi(tokenized)
        scores = bm25.get_scores(tokenize(query))

        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            chunk = CorpusChunk(
                chunk_id=f"eph-{uuid.uuid4().hex[:8]}",
                doc_id="ephemeral",
                text=chunks[idx],
                chunk_index=idx,
            )
            results.append(ChunkResult(
                chunk=chunk,
                score=float(scores[idx]),
                source="ephemeral",
                doc_title="Uploaded Document",
                doc_source_type="user_upload",
            ))
        return results
    except ImportError:
        logger.warning("rank_bm25 not installed — ephemeral search unavailable")
        return []
    except Exception as e:
        logger.warning(f"Ephemeral search failed: {e}")
        return []


# ── Merged search ────────────────────────────────────────────────────────────

async def merged_search(
    query: str,
    document_text: Optional[str] = None,
    top_k: int = 8,
) -> list[ChunkResult]:
    """Merge corpus retrieval with optional ephemeral document retrieval."""
    from services.rerank import reciprocal_rank_fusion

    corpus_results = await hybrid_search(query, top_k=top_k)

    if not document_text:
        return corpus_results

    eph_results = ephemeral_search(document_text, query, top_k=min(top_k, 5))

    if not corpus_results and not eph_results:
        return []

    all_lists = []
    if corpus_results:
        all_lists.append(corpus_results)
    if eph_results:
        all_lists.append(eph_results)

    return reciprocal_rank_fusion(all_lists)[:top_k]
