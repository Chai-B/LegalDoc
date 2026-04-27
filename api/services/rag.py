"""
Stateless BM25 RAG pipeline.
No database, no persistence. Per-request: chunk → index → retrieve → return context.
"""
import re
import logging
from typing import List

logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> List[str]:
    """Split text into overlapping word-count chunks."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []

    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = ' '.join(words[start:end])
        if len(chunk.strip()) > 50:
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap

    return chunks


def tokenize(text: str) -> List[str]:
    """Lowercase + remove punctuation tokenizer."""
    return re.sub(r'[^\w\s]', ' ', text.lower()).split()


def build_rag_context(document: str, query: str, top_k: int = 5) -> str:
    """
    Return the top-k most relevant document chunks for the query.
    Uses BM25Okapi. Fully in-memory, no side effects.
    """
    try:
        from rank_bm25 import BM25Okapi
    except ImportError:
        logger.warning("rank_bm25 not installed — returning truncated document")
        return document[:4000]

    chunks = chunk_text(document)
    if not chunks:
        return document[:3000]

    try:
        tokenized = [tokenize(c) for c in chunks]
        bm25 = BM25Okapi(tokenized)
        scores = bm25.get_scores(tokenize(query))

        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        top_indices_ordered = sorted(top_indices)  # restore document order

        return '\n\n---\n\n'.join(chunks[i] for i in top_indices_ordered)
    except Exception as e:
        logger.warning(f"BM25 failed, falling back to truncation: {e}")
        return document[:4000]
