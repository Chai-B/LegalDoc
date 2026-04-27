#!/usr/bin/env python3
"""Ingest public Indian-law corpus into the vector database.

Usage:
    python scripts/ingest_public_corpus.py --source scripts/ingestion_sources.example.json
    python scripts/ingest_public_corpus.py --source manifest.json --dry-run
"""
import argparse
import asyncio
import json
import logging
import os
import sys
import uuid
from pathlib import Path

# Add api/ to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from models import CorpusDocument, CorpusChunk, SourceType
from services.legal_chunking import auto_chunk

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def load_manifest(path: str) -> list[dict]:
    with open(path) as f:
        return json.load(f)


def extract_text(entry: dict) -> str:
    """Extract text from the source file."""
    local_path = entry.get("local_path", "")
    if not local_path or not os.path.exists(local_path):
        logger.warning(f"File not found: {local_path} — skipping")
        return ""

    if local_path.endswith(".pdf"):
        from services.pdf_parser import extract_text_from_pdf
        with open(local_path, "rb") as f:
            return extract_text_from_pdf(f.read())
    elif local_path.endswith(".txt"):
        with open(local_path, "r", encoding="utf-8") as f:
            return f.read()
    elif local_path.endswith(".docx"):
        from services.pdf_parser import extract_text_from_docx
        with open(local_path, "rb") as f:
            return extract_text_from_docx(f.read())
    else:
        logger.warning(f"Unsupported file type: {local_path}")
        return ""


async def ingest(manifest_path: str, dry_run: bool = False):
    entries = load_manifest(manifest_path)
    logger.info(f"Loaded {len(entries)} sources from manifest")

    total_chunks = 0

    for entry in entries:
        title = entry.get("title", "Untitled")
        source_type = entry.get("source_type", "statute")
        doc_id = f"doc-{uuid.uuid5(uuid.NAMESPACE_URL, title).hex[:12]}"

        text = extract_text(entry)
        if not text or len(text.strip()) < 100:
            logger.warning(f"Skipping '{title}' — insufficient text extracted")
            continue

        doc = CorpusDocument(
            doc_id=doc_id,
            title=title,
            source_type=SourceType(source_type),
            authority=entry.get("authority", ""),
            citation=entry.get("citation", ""),
            source_url=entry.get("source_url", ""),
        )

        chunks_meta = auto_chunk(text, source_type)
        logger.info(f"  '{title}': {len(chunks_meta)} chunks")
        total_chunks += len(chunks_meta)

        if dry_run:
            for cm in chunks_meta[:3]:
                logger.info(f"    [{cm.section_ref}] {cm.text[:80]}...")
            continue

        # Persist
        from services.corpus_store import upsert_document, persist_chunks
        from services.embeddings import embed_batch

        await upsert_document(doc)

        chunk_texts = [cm.text for cm in chunks_meta]
        embeddings = await embed_batch(chunk_texts)

        corpus_chunks = [
            CorpusChunk(
                chunk_id=f"{doc_id}-{cm.chunk_index}",
                doc_id=doc_id,
                text=cm.text,
                section_ref=cm.section_ref,
                chunk_index=cm.chunk_index,
                embedding=emb,
            )
            for cm, emb in zip(chunks_meta, embeddings)
        ]

        persisted = await persist_chunks(corpus_chunks)
        logger.info(f"  Persisted {persisted} chunks for '{title}'")

    logger.info(f"\nTotal: {total_chunks} chunks across {len(entries)} sources")
    if dry_run:
        logger.info("DRY RUN — no data was persisted")


def main():
    parser = argparse.ArgumentParser(description="Ingest public corpus")
    parser.add_argument("--source", required=True, help="Path to ingestion manifest JSON")
    parser.add_argument("--dry-run", action="store_true", help="Preview without persisting")
    args = parser.parse_args()

    asyncio.run(ingest(args.source, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
