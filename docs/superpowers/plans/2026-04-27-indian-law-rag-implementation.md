# Indian Law RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn LegalDoc into a useful Indian-law research and document-analysis tool with a persistent shared public corpus, vector-first hybrid retrieval, and ephemeral user document analysis.

**Architecture:** Keep the Next.js frontend simple, but move the legal intelligence into a Python backend that supports persistent corpus ingestion, embeddings, hybrid retrieval, reranking, citations, and confidence scoring. User uploads remain in-memory only and are merged with public-corpus retrieval at query time.

**Tech Stack:** Next.js 14, FastAPI, PostgreSQL, pgvector, object storage, OpenAI-compatible embeddings + chat completions, Vercel frontend, separate Python backend service

---

### Task 1: Remove Misleading UI Positioning

**Files:**
- Modify: `app/dashboard/page.tsx`
- Test: `npm run build`

- [ ] **Step 1: Write the failing expectation as a manual check**

Manual check:
- Open the dashboard hero copy.
- Confirm the phrase `Production-grade tools for legal document review` is still present.
- Expected: the phrase exists and must be removed or replaced.

- [ ] **Step 2: Replace misleading hero copy**

Update `app/dashboard/page.tsx`:
- Replace `Production-grade tools for legal document review`
- Use neutral copy focused on Indian-law legal research and document analysis
- Ensure no page uses `production-grade` as marketing text

- [ ] **Step 3: Run build to verify no UI breakage**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "chore: remove misleading production-grade UI copy"
```

### Task 2: Introduce Retrieval-Oriented Backend Structure

**Files:**
- Create: `api/config.py`
- Create: `api/db.py`
- Create: `api/models.py`
- Create: `api/schemas.py`
- Create: `api/services/embeddings.py`
- Create: `api/services/corpus_store.py`
- Create: `api/services/retrieval.py`
- Create: `api/services/rerank.py`
- Modify: `api/index.py`
- Modify: `api/requirements.txt`
- Test: `python3 -m compileall api`

- [ ] **Step 1: Write a failing import check**

Add temporary compile target expectation:
- `api/index.py` should eventually import centralized config, schemas, and retrieval services
- Expected now: those modules do not exist

- [ ] **Step 2: Add backend configuration module**

Create `api/config.py` with:
- environment accessors for DB URL, vector dimensions, embedding model, corpus source settings, allowed origins
- helper validation for required runtime config

- [ ] **Step 3: Add database bootstrap**

Create `api/db.py` with:
- SQLAlchemy engine/session setup or a psycopg-based abstraction
- connection helper for both API runtime and ingestion jobs

- [ ] **Step 4: Add persistence models**

Create `api/models.py` for:
- `CorpusDocument`
- `CorpusChunk`
- `SourceType`
- fields for title, authority, citation, section_ref, source_url, published_at, embedding vector reference, text, chunk_index

- [ ] **Step 5: Add shared API schemas**

Create `api/schemas.py` for:
- query request/response
- citation response
- confidence response
- corpus search result response
- document-augmented query response

- [ ] **Step 6: Add embeddings abstraction**

Create `api/services/embeddings.py` with:
- model wrapper for embedding public corpus text
- batch embedding helper
- single-query embedding helper

- [ ] **Step 7: Add corpus storage abstraction**

Create `api/services/corpus_store.py` with:
- create/update document metadata
- persist chunk records
- fetch chunk text + metadata by ids

- [ ] **Step 8: Add retrieval service shell**

Create `api/services/retrieval.py` with public APIs for:
- vector search
- keyword search
- hybrid fusion
- ephemeral document retrieval
- merged retrieval

- [ ] **Step 9: Add rerank abstraction**

Create `api/services/rerank.py` with:
- deterministic score fusion first
- clear extension point for model-based reranking later

- [ ] **Step 10: Update requirements**

Add dependencies needed for:
- PostgreSQL access
- SQL toolkit / migrations choice
- pgvector support
- optional tokenization helpers for keyword search

- [ ] **Step 11: Verify backend compiles**

Run: `python3 -m compileall api`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add api
git commit -m "feat: add retrieval-oriented backend foundations"
```

### Task 3: Add Persistent Corpus Schema and Local Bootstrap

**Files:**
- Create: `scripts/create_corpus_tables.sql`
- Create: `scripts/bootstrap_corpus_db.py`
- Modify: `.env.example`
- Test: `python3 scripts/bootstrap_corpus_db.py --check`

- [ ] **Step 1: Write the schema contract**

Define required persisted entities:
- documents table
- chunks table
- vector index
- indexes on source type, citation fields, title, authority

- [ ] **Step 2: Add SQL bootstrap**

Create `scripts/create_corpus_tables.sql` with:
- extension enablement for `vector`
- normalized tables
- indexes

- [ ] **Step 3: Add bootstrap script**

Create `scripts/bootstrap_corpus_db.py` to:
- connect to DB
- apply bootstrap SQL
- support `--check` mode

- [ ] **Step 4: Document env variables**

Update `.env.example` with:
- `DATABASE_URL`
- `EMBEDDING_MODEL`
- `EMBEDDING_BASE_URL` if separate
- `EMBEDDING_API_KEY`
- `PUBLIC_CORPUS_BUCKET` or equivalent

- [ ] **Step 5: Verify bootstrap script**

Run: `python3 scripts/bootstrap_corpus_db.py --check`
Expected: PASS or a clear missing-config message

- [ ] **Step 6: Commit**

```bash
git add scripts .env.example
git commit -m "feat: add corpus database bootstrap"
```

### Task 4: Build Public Corpus Ingestion Pipeline

**Files:**
- Create: `api/services/legal_chunking.py`
- Create: `scripts/ingest_public_corpus.py`
- Create: `scripts/ingestion_sources.example.json`
- Modify: `api/services/pdf_parser.py`
- Test: `python3 scripts/ingest_public_corpus.py --dry-run --source scripts/ingestion_sources.example.json`

- [ ] **Step 1: Write a dry-run ingestion contract**

Expected behavior:
- load source manifest
- extract text
- legal-aware chunking by source type
- generate metadata objects
- no persistence in dry-run mode

- [ ] **Step 2: Add legal-aware chunking**

Create `api/services/legal_chunking.py`:
- statute/rule chunking by headings/sections where possible
- judgment chunking by paragraph windows/headings
- circular chunking by numbered headings
- fallback chunking for malformed sources

- [ ] **Step 3: Extend extraction helpers if needed**

Modify `api/services/pdf_parser.py` only if required for ingestion compatibility:
- preserve structure where feasible
- avoid breaking ephemeral upload extraction

- [ ] **Step 4: Create ingestion manifest format**

Create `scripts/ingestion_sources.example.json` with source entries containing:
- title
- source_type
- authority
- url
- local_path or remote source pointer
- citation
- published_at

- [ ] **Step 5: Implement ingestion script**

Create `scripts/ingest_public_corpus.py` to:
- read manifest
- extract source text
- chunk
- embed
- persist documents and chunks
- support `--dry-run`

- [ ] **Step 6: Run dry-run verification**

Run: `python3 scripts/ingest_public_corpus.py --dry-run --source scripts/ingestion_sources.example.json`
Expected: PASS with chunk counts and metadata summary

- [ ] **Step 7: Commit**

```bash
git add api/services/legal_chunking.py scripts
git commit -m "feat: add public corpus ingestion pipeline"
```

### Task 5: Implement Vector-First Hybrid Retrieval

**Files:**
- Modify: `api/services/retrieval.py`
- Modify: `api/services/rag.py`
- Create: `api/tests/test_retrieval.py`
- Test: `python3 -m unittest api/tests/test_retrieval.py`

- [ ] **Step 1: Write failing retrieval tests**

Add tests for:
- vector retrieval returns ranked chunks
- keyword retrieval returns ranked chunks
- hybrid fusion preserves high-signal results
- fallback behavior when vector service is unavailable

- [ ] **Step 2: Implement vector retrieval**

In `api/services/retrieval.py` add:
- query embedding generation
- nearest-neighbor search over persisted corpus chunks

- [ ] **Step 3: Implement keyword retrieval**

Add lexical retrieval over persisted corpus chunks:
- SQL full-text or in-process BM25 over fetched candidate set

- [ ] **Step 4: Implement score fusion**

Add deterministic hybrid fusion:
- normalize scores
- combine vector and lexical scores
- preserve metadata and citations

- [ ] **Step 5: Reframe old BM25 helper**

Modify `api/services/rag.py` so it becomes ephemeral document retrieval only:
- chunk uploaded text
- build in-memory retrieval structure
- no longer represent the main public-corpus RAG path

- [ ] **Step 6: Run retrieval tests**

Run: `python3 -m unittest api/tests/test_retrieval.py`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api/services/retrieval.py api/services/rag.py api/tests/test_retrieval.py
git commit -m "feat: implement vector-first hybrid retrieval"
```

### Task 6: Add Corpus Query API with Citations and Confidence

**Files:**
- Modify: `api/index.py`
- Modify: `api/schemas.py`
- Create: `api/tests/test_corpus_query_api.py`
- Test: `python3 -m unittest api/tests/test_corpus_query_api.py`

- [ ] **Step 1: Write failing API tests**

Cover:
- corpus-only query
- corpus + user document query
- low-support query confidence labeling
- response includes citations

- [ ] **Step 2: Add new query route**

Add endpoint shape such as:
- `POST /api/research/query`

Request fields:
- `question`
- optional `document_text`
- optional retrieval mode

Response fields:
- `answer`
- `citations`
- `confidence`
- `document_findings`
- `legal_context`

- [ ] **Step 3: Implement confidence logic**

Confidence should consider:
- top retrieval scores
- source diversity
- source type quality
- whether support came from corpus only or corpus + document

- [ ] **Step 4: Add prompt with strict source separation**

Prompt rules:
- state what the uploaded document says
- state what Indian-law sources suggest
- call out uncertainty
- do not silently override document language

- [ ] **Step 5: Run API tests**

Run: `python3 -m unittest api/tests/test_corpus_query_api.py`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/index.py api/schemas.py api/tests/test_corpus_query_api.py
git commit -m "feat: add corpus query api with citations and confidence"
```

### Task 7: Upgrade Legal Q&A to Use Corpus + Ephemeral Document Retrieval

**Files:**
- Modify: `app/tools/legal-qa/page.tsx`
- Modify: `lib/api.ts`
- Modify: `api/index.py`
- Test: `npm run build`

- [ ] **Step 1: Write the API client change**

Replace direct `/api/understand/qa` dependency with the new retrieval-aware endpoint.

- [ ] **Step 2: Update frontend state model**

In `app/tools/legal-qa/page.tsx`:
- support corpus-backed answers
- surface confidence
- surface citations
- optionally distinguish document facts vs legal context

- [ ] **Step 3: Update backend handler wiring**

Either:
- rewrite `/api/understand/qa` to delegate to the new retrieval service
- or replace it with the new endpoint entirely

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/tools/legal-qa/page.tsx lib/api.ts api/index.py
git commit -m "feat: upgrade legal qa to corpus-backed retrieval"
```

### Task 8: Upgrade Document Analyzer, Risk Scorer, and Clause Extractor

**Files:**
- Modify: `app/tools/document-analyzer/page.tsx`
- Modify: `app/tools/risk-scorer/page.tsx`
- Modify: `app/tools/clause-extractor/page.tsx`
- Modify: `api/index.py`
- Modify: `lib/api.ts`
- Test: `npm run build`

- [ ] **Step 1: Write tool behavior contract**

Each tool must:
- use uploaded document text as primary factual input
- augment with retrieved Indian-law context
- return source-aware output

- [ ] **Step 2: Upgrade document analyzer backend prompt**

Require:
- document findings
- relevant Indian-law context
- gaps/mismatches
- cited support

- [ ] **Step 3: Upgrade risk scorer backend prompt and scoring policy**

Require:
- score informed by document + corpus context
- explicit legal/commercial risk basis

- [ ] **Step 4: Upgrade clause extractor backend prompt**

Require:
- clause extraction from document text
- legal-context explanation only where relevant

- [ ] **Step 5: Update frontend UI copy/results**

Adjust tool pages to render:
- confidence where returned
- source-backed framing

- [ ] **Step 6: Verify production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/tools/document-analyzer/page.tsx app/tools/risk-scorer/page.tsx app/tools/clause-extractor/page.tsx lib/api.ts api/index.py
git commit -m "feat: add corpus-backed analysis tools"
```

### Task 9: Ground Drafting Tools in Indian-Law Retrieval

**Files:**
- Modify: `app/tools/contract-drafter/page.tsx`
- Modify: `app/tools/nda-generator/page.tsx`
- Modify: `api/index.py`
- Modify: `lib/api.ts`
- Test: `npm run build`

- [ ] **Step 1: Define retrieval-assisted drafting contract**

Drafting outputs should:
- use retrieved Indian-law context
- remain template-like and structured
- surface assumptions

- [ ] **Step 2: Update backend prompts**

For contract drafter and NDA generator:
- retrieve relevant public corpus chunks first
- feed them into drafting prompts
- keep placeholders explicit

- [ ] **Step 3: Update frontend messaging**

Make it clear outputs are research-informed drafts, not freeform generation.

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/tools/contract-drafter/page.tsx app/tools/nda-generator/page.tsx lib/api.ts api/index.py
git commit -m "feat: ground drafting tools in indian-law retrieval"
```

### Task 10: Add Retrieval Result UI Components

**Files:**
- Create: `components/tools/citation-list.tsx`
- Create: `components/tools/confidence-badge.tsx`
- Modify: `components/tools/result-panel.tsx`
- Modify: `components/tools/tool-layout.tsx`
- Test: `npm run build`

- [ ] **Step 1: Write UI contract**

Need reusable rendering for:
- citations
- confidence level
- document findings vs legal context sections

- [ ] **Step 2: Build citation list component**

Create `components/tools/citation-list.tsx`:
- title
- source type
- authority/citation
- optional URL

- [ ] **Step 3: Build confidence badge**

Create `components/tools/confidence-badge.tsx`:
- high / medium / low rendering
- neutral styling

- [ ] **Step 4: Extend result panel**

Modify `components/tools/result-panel.tsx` to support:
- structured answer payloads
- citations
- confidence

- [ ] **Step 5: Verify production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/tools
git commit -m "feat: add retrieval result ui components"
```

### Task 11: Add Deployment and Runtime Hardening

**Files:**
- Modify: `.env.example`
- Modify: `vercel.json`
- Create: `backend.env.example`
- Create: `docs/DEPLOYMENT.md`
- Test: `npm run build`
- Test: `python3 -m compileall api`

- [ ] **Step 1: Separate frontend and backend env contracts**

Document:
- Vercel frontend env vars
- backend service env vars
- DB/vector service vars
- object storage vars

- [ ] **Step 2: Revisit Vercel config**

Ensure `vercel.json` is frontend-only and no longer implies a long-term serverless backend if backend is being split.

- [ ] **Step 3: Add backend env example**

Create `backend.env.example` with retrieval and persistence config.

- [ ] **Step 4: Add minimal deployment documentation**

Create `docs/DEPLOYMENT.md` covering:
- Vercel frontend deploy
- backend deploy assumptions
- DB bootstrap
- corpus ingestion

- [ ] **Step 5: Verify build and backend compile**

Run: `npm run build`
Expected: PASS

Run: `python3 -m compileall api`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .env.example backend.env.example vercel.json docs/DEPLOYMENT.md
git commit -m "docs: add deployment and runtime configuration"
```

### Task 12: Final Verification

**Files:**
- Test: `npm run build`
- Test: `python3 -m unittest api/tests/test_text_validation.py`
- Test: `python3 -m unittest api/tests/test_retrieval.py`
- Test: `python3 -m unittest api/tests/test_corpus_query_api.py`

- [ ] **Step 1: Run frontend build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run backend baseline tests**

Run: `python3 -m unittest api/tests/test_text_validation.py`
Expected: PASS

- [ ] **Step 3: Run retrieval tests**

Run: `python3 -m unittest api/tests/test_retrieval.py`
Expected: PASS

- [ ] **Step 4: Run corpus API tests**

Run: `python3 -m unittest api/tests/test_corpus_query_api.py`
Expected: PASS

- [ ] **Step 5: Smoke-check critical UX**

Manual checks:
- corpus-only legal query returns citations and confidence
- uploaded document analysis returns document findings plus legal context
- no user-uploaded file is persisted

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: finalize indian-law rag rollout"
```
