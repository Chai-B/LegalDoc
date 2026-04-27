"""Corpus storage — CRUD for documents and chunks in PostgreSQL + pgvector."""
import logging
from typing import Optional

from models import CorpusDocument, CorpusChunk

logger = logging.getLogger(__name__)


async def upsert_document(doc: CorpusDocument) -> bool:
    """Insert or update a corpus document record. Returns True on success."""
    try:
        from db import get_connection
    except ImportError:
        return False

    try:
        async with get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO corpus_documents (doc_id, title, source_type, authority, citation,
                    source_url, published_at, jurisdiction)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (doc_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    source_type = EXCLUDED.source_type,
                    authority = EXCLUDED.authority,
                    citation = EXCLUDED.citation,
                    source_url = EXCLUDED.source_url,
                    published_at = EXCLUDED.published_at,
                    jurisdiction = EXCLUDED.jurisdiction
                """,
                (doc.doc_id, doc.title, doc.source_type.value, doc.authority,
                 doc.citation, doc.source_url, doc.published_at, doc.jurisdiction),
            )
        return True
    except Exception as e:
        logger.error(f"Document upsert failed: {e}")
        return False


async def persist_chunks(chunks: list[CorpusChunk]) -> int:
    """Batch insert chunk records with embeddings. Returns count persisted."""
    if not chunks:
        return 0

    try:
        from db import get_connection
    except ImportError:
        return 0

    persisted = 0
    try:
        async with get_connection() as conn:
            for chunk in chunks:
                embedding_str = (
                    f"[{','.join(str(v) for v in chunk.embedding)}]"
                    if chunk.embedding else None
                )
                await conn.execute(
                    """
                    INSERT INTO corpus_chunks (chunk_id, doc_id, text, section_ref,
                        chunk_index, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s::vector)
                    ON CONFLICT (chunk_id) DO UPDATE SET
                        text = EXCLUDED.text,
                        section_ref = EXCLUDED.section_ref,
                        embedding = EXCLUDED.embedding
                    """,
                    (chunk.chunk_id, chunk.doc_id, chunk.text, chunk.section_ref,
                     chunk.chunk_index, embedding_str),
                )
                persisted += 1
        return persisted
    except Exception as e:
        logger.error(f"Chunk persistence failed after {persisted} records: {e}")
        return persisted


async def fetch_chunks_by_ids(chunk_ids: list[str]) -> list[CorpusChunk]:
    """Retrieve chunk records by IDs."""
    if not chunk_ids:
        return []

    try:
        from db import get_connection
    except ImportError:
        return []

    try:
        async with get_connection() as conn:
            placeholders = ",".join(["%s"] * len(chunk_ids))
            result = await conn.execute(
                f"SELECT chunk_id, doc_id, text, section_ref, chunk_index FROM corpus_chunks WHERE chunk_id IN ({placeholders})",
                chunk_ids,
            )
            rows = await result.fetchall()
            return [
                CorpusChunk(
                    chunk_id=r[0], doc_id=r[1], text=r[2],
                    section_ref=r[3], chunk_index=r[4],
                )
                for r in rows
            ]
    except Exception as e:
        logger.error(f"Chunk fetch failed: {e}")
        return []
