"""Embedding service — wraps an OpenAI-compatible embeddings API."""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    from config import EMBEDDING_BASE_URL, EMBEDDING_API_KEY
    if not EMBEDDING_API_KEY:
        logger.warning("EMBEDDING_API_KEY not set — embedding features disabled")
        return None

    try:
        from openai import AsyncOpenAI
        _client = AsyncOpenAI(base_url=EMBEDDING_BASE_URL, api_key=EMBEDDING_API_KEY)
        return _client
    except ImportError:
        logger.warning("openai package not installed")
        return None


async def embed_text(text: str) -> Optional[list[float]]:
    """Embed a single text string. Returns None if service unavailable."""
    client = _get_client()
    if client is None:
        return None

    from config import EMBEDDING_MODEL, EMBEDDING_DIMENSIONS
    try:
        resp = await client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text[:8000],
            dimensions=EMBEDDING_DIMENSIONS,
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return None


async def embed_batch(texts: list[str], batch_size: int = 64) -> list[Optional[list[float]]]:
    """Embed a batch of texts. Returns list aligned with input; None for failures."""
    client = _get_client()
    if client is None:
        return [None] * len(texts)

    from config import EMBEDDING_MODEL, EMBEDDING_DIMENSIONS
    results: list[Optional[list[float]]] = []

    for start in range(0, len(texts), batch_size):
        batch = [t[:8000] for t in texts[start:start + batch_size]]
        try:
            resp = await client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            results.extend(item.embedding for item in resp.data)
        except Exception as e:
            logger.error(f"Batch embedding failed at offset {start}: {e}")
            results.extend([None] * len(batch))

    return results
