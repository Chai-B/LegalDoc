-- Indian Law Corpus Schema for PostgreSQL + pgvector
-- Run: psql $DATABASE_URL -f scripts/create_corpus_tables.sql

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Corpus Documents ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS corpus_documents (
    doc_id          TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    source_type     TEXT NOT NULL CHECK (source_type IN ('statute', 'rule', 'judgment', 'circular')),
    authority       TEXT DEFAULT '',
    citation        TEXT DEFAULT '',
    source_url      TEXT DEFAULT '',
    published_at    DATE,
    jurisdiction    TEXT DEFAULT 'India',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corpus_docs_source_type ON corpus_documents (source_type);
CREATE INDEX IF NOT EXISTS idx_corpus_docs_authority ON corpus_documents (authority);
CREATE INDEX IF NOT EXISTS idx_corpus_docs_title ON corpus_documents USING gin (to_tsvector('english', title));

-- ── Corpus Chunks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS corpus_chunks (
    chunk_id        TEXT PRIMARY KEY,
    doc_id          TEXT NOT NULL REFERENCES corpus_documents(doc_id) ON DELETE CASCADE,
    text            TEXT NOT NULL,
    section_ref     TEXT DEFAULT '',
    chunk_index     INTEGER DEFAULT 0,
    embedding       vector(1536),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corpus_chunks_doc_id ON corpus_chunks (doc_id);
CREATE INDEX IF NOT EXISTS idx_corpus_chunks_text_fts ON corpus_chunks USING gin (to_tsvector('english', text));

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_corpus_chunks_embedding ON corpus_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);
