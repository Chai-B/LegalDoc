# Deployment Guide

## Architecture

LegalDoc is a split frontend/backend application:

- **Frontend**: Next.js 14, deployed on Vercel
- **Backend**: Python FastAPI, currently deployed as a Vercel serverless function (planned migration to dedicated service)

## Frontend Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_APP_URL` — your Vercel domain
   - `NEXT_PUBLIC_API_BASE_URL` — backend URL (leave empty if using Vercel serverless)
3. Deploy

## Backend Deployment

### Current: Vercel Serverless

The backend runs as a Python serverless function via `api/index.py` + Mangum.

Configuration: `vercel.json` routes `/api/*` to the Python function.

Limitations:
- 60s max duration per request
- No persistent connections
- Corpus retrieval requires external DB

### Planned: Dedicated Backend

For full corpus support, deploy the backend independently:

```bash
cd api
pip install -r requirements.txt
uvicorn index:app --host 0.0.0.0 --port 8000
```

Set `NEXT_PUBLIC_API_BASE_URL=https://your-backend.com` on the Vercel frontend.

## Database Setup

### PostgreSQL + pgvector

1. Create a PostgreSQL database with pgvector extension
2. Set `DATABASE_URL` in the backend environment
3. Bootstrap the schema:

```bash
python scripts/bootstrap_corpus_db.py
```

4. Verify:

```bash
python scripts/bootstrap_corpus_db.py --check
```

## Corpus Ingestion

1. Prepare a manifest JSON (see `scripts/ingestion_sources.example.json`)
2. Place source PDFs/TXT files at the paths specified in the manifest
3. Dry run:

```bash
python scripts/ingest_public_corpus.py --source manifest.json --dry-run
```

4. Ingest:

```bash
python scripts/ingest_public_corpus.py --source manifest.json
```

## Environment Variables

See `.env.example` (frontend + shared) and `backend.env.example` (backend-specific).

### Required for basic operation:
- `LLM_API_KEY` — AI provider API key
- `LLM_BASE_URL` — AI provider base URL

### Required for corpus features:
- `DATABASE_URL` — PostgreSQL connection string
- `EMBEDDING_API_KEY` — Embedding provider API key

### Optional:
- `EMBEDDING_MODEL` — defaults to `text-embedding-3-small`
- `EMBEDDING_DIMENSIONS` — defaults to 1536
- `RETRIEVAL_TOP_K` — defaults to 8
