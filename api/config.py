"""Centralized configuration for the LegalDoc backend."""
from __future__ import annotations

import os
from typing import Optional, List


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def _env_int(key: str, default: int = 0) -> int:
    raw = os.getenv(key, "")
    try:
        return int(raw)
    except (ValueError, TypeError):
        return default


# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL: str = _env("DATABASE_URL")

# ── Embeddings ───────────────────────────────────────────────────────────────
EMBEDDING_BASE_URL: str = _env("EMBEDDING_BASE_URL", "https://api.openai.com/v1")
EMBEDDING_API_KEY: str = _env("EMBEDDING_API_KEY")
EMBEDDING_MODEL: str = _env("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS: int = _env_int("EMBEDDING_DIMENSIONS", 1536)

# ── LLM (re-exported for convenience) ───────────────────────────────────────
LLM_BASE_URL: str = _env("LLM_BASE_URL", "https://openrouter.ai/api/v1")
LLM_API_KEY: str = _env("LLM_API_KEY")
LLM_MODEL: str = _env("LLM_MODEL", "google/gemini-flash-1.5")

# ── Corpus ───────────────────────────────────────────────────────────────────
PUBLIC_CORPUS_BUCKET: str = _env("PUBLIC_CORPUS_BUCKET")

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS: list[str] = [
    o.strip() for o in _env("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

# ── Retrieval defaults ───────────────────────────────────────────────────────
DEFAULT_TOP_K: int = _env_int("RETRIEVAL_TOP_K", 8)
VECTOR_WEIGHT: float = 0.7
KEYWORD_WEIGHT: float = 0.3


def has_database() -> bool:
    return bool(DATABASE_URL)


def has_embeddings() -> bool:
    return bool(EMBEDDING_API_KEY)


def validate_corpus_config() -> list[str]:
    """Return list of missing config keys required for corpus operations."""
    missing: list[str] = []
    if not DATABASE_URL:
        missing.append("DATABASE_URL")
    if not EMBEDDING_API_KEY:
        missing.append("EMBEDDING_API_KEY")
    return missing
