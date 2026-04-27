"""Database connection helpers for the LegalDoc backend.

Uses psycopg (async) for PostgreSQL access. Gracefully degrades when
DATABASE_URL is not configured — callers must check before use.
"""
import logging
from typing import Optional
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

_pool = None


async def get_pool():
    """Return the shared connection pool, creating it on first call."""
    global _pool
    if _pool is not None:
        return _pool

    from config import DATABASE_URL
    if not DATABASE_URL:
        logger.warning("DATABASE_URL not set — database features disabled")
        return None

    try:
        from psycopg_pool import AsyncConnectionPool
        _pool = AsyncConnectionPool(conninfo=DATABASE_URL, min_size=1, max_size=5)
        await _pool.open()
        logger.info("Database pool opened")
        return _pool
    except ImportError:
        logger.warning("psycopg_pool not installed — database features disabled")
        return None
    except Exception as e:
        logger.error(f"Failed to create database pool: {e}")
        return None


@asynccontextmanager
async def get_connection():
    """Yield an async connection from the pool. Raises if pool unavailable."""
    pool = await get_pool()
    if pool is None:
        raise RuntimeError("Database not configured")
    async with pool.connection() as conn:
        yield conn


async def close_pool():
    """Shutdown the connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")
