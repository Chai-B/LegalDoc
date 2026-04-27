#!/usr/bin/env python3
"""Bootstrap the Indian-law corpus database.

Usage:
    python scripts/bootstrap_corpus_db.py          # Apply schema
    python scripts/bootstrap_corpus_db.py --check   # Verify tables exist
"""
import argparse
import os
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Bootstrap corpus database")
    parser.add_argument("--check", action="store_true", help="Verify tables without modifying")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set. Set it in your environment or .env file.")
        sys.exit(1)

    try:
        import psycopg
    except ImportError:
        print("ERROR: psycopg not installed. Run: pip install 'psycopg[binary]'")
        sys.exit(1)

    conn = psycopg.connect(db_url)
    cur = conn.cursor()

    if args.check:
        _check_tables(cur)
    else:
        _apply_schema(cur, conn)

    cur.close()
    conn.close()


def _check_tables(cur):
    """Verify that required tables exist."""
    tables = ["corpus_documents", "corpus_chunks"]
    for table in tables:
        cur.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s)",
            (table,),
        )
        exists = cur.fetchone()[0]
        status = "✓" if exists else "✗ MISSING"
        print(f"  {status}  {table}")

    cur.execute("SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')")
    vec_exists = cur.fetchone()[0]
    status = "✓" if vec_exists else "✗ MISSING"
    print(f"  {status}  pgvector extension")

    if not vec_exists:
        print("\nWARNING: pgvector extension not installed.")
        sys.exit(1)

    print("\nAll checks passed." if all else "Some checks failed.")


def _apply_schema(cur, conn):
    """Apply the SQL bootstrap script."""
    sql_path = Path(__file__).parent / "create_corpus_tables.sql"
    if not sql_path.exists():
        print(f"ERROR: SQL file not found: {sql_path}")
        sys.exit(1)

    sql = sql_path.read_text()
    print("Applying corpus schema...")
    try:
        cur.execute(sql)
        conn.commit()
        print("Schema applied successfully.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Schema application failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
