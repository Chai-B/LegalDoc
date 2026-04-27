# Indian Law RAG Design

## Goal

Upgrade LegalDoc from prompt-only document utilities plus in-memory BM25 retrieval into a useful Indian-law research and document-analysis product with:

- a persistent shared Indian-law corpus
- semantic vector retrieval as the primary retrieval mode
- hybrid retrieval support for better precision
- no accounts or authentication
- no persistence of user-uploaded documents

The product should remain simple for end users while becoming materially more trustworthy and useful for lawyers and law students.

## Product Constraints

- Jurisdiction scope is Indian law only.
- Persisted corpus is shared and curated by the operator.
- Persisted corpus includes:
  - bare acts
  - rules
  - landmark judgments
  - regulator guidance and circulars
- User-uploaded documents must never be saved server-side.
- No user accounts or authentication.
- The system may give best-effort answers when support is weak, but must clearly label confidence.
- The UI must not market itself using phrases like "production-grade".

## Core Product Behavior

There are two knowledge layers:

1. Shared public Indian-law corpus
2. Ephemeral user document context

The shared public corpus is the primary retrieval layer for most queries.

User-uploaded documents are secondary context used only during the current request or in-memory session. They are not stored, indexed persistently, or reused later.

The system should answer by combining:

- what the uploaded document explicitly says
- what the retrieved Indian-law corpus suggests

The answer must distinguish those two sources rather than blending them invisibly.

## Retrieval Model

### Public Corpus Retrieval

Public corpus retrieval should be hybrid with vector search as the dominant signal.

Required stages:

1. Semantic vector retrieval over persisted chunk embeddings
2. Lexical retrieval over the same chunk set
3. Fusion and reranking
4. Prompt construction with chunk citations and metadata

Reasons:

- Statutes and circulars often require exact wording matches.
- Judgments benefit from semantic retrieval.
- Hybrid retrieval is more robust than pure vector or pure BM25 for legal material.

### User Document Retrieval

User documents remain ephemeral.

Required stages:

1. Extract text in memory
2. Chunk in memory
3. Build temporary retrieval structure in memory
4. Retrieve relevant document chunks for the current query
5. Discard data after request lifecycle or short-lived session memory

This layer may use:

- BM25 only at first for simplicity
- or temporary embeddings later if latency is acceptable

The key constraint is that none of this data is persisted.

### Merge Strategy

For document-related tools, retrieval should merge:

- top public-corpus results
- top ephemeral user-document results

Then rerank jointly.

Prompt instructions must enforce source hierarchy:

1. First, state what the uploaded document actually says.
2. Second, explain relevant Indian-law context from retrieved public authorities.
3. Third, identify mismatch, risk, ambiguity, or likely legal implications.

The model must not overwrite or "correct" the user document with public-law context. It should compare and explain, not silently substitute.

## Corpus Design

### Source Types

The persisted Indian-law corpus should support at least these source classes:

- statutes / bare acts
- subordinate legislation / rules / regulations
- judgments
- regulator guidance / circulars / notifications

### Metadata

Each chunk should carry metadata sufficient for citation and filtering:

- source type
- title
- issuing authority or court
- act / regulation / case name
- citation or official identifier if available
- section / rule / chapter / paragraph reference
- date
- jurisdiction tag
- publication URL or source URL
- chunk index
- document id

### Chunking Strategy

Chunking should respect legal structure whenever possible.

Recommended rules:

- Acts and rules: chunk by section, subsection, or rule boundary
- Judgments: chunk by headnote, issues, reasoning, or paragraph ranges
- Circulars/guidance: chunk by numbered sections or headings

Avoid naive fixed-width chunking for public corpus ingestion unless structure parsing fails.

## Tool Behavior Changes

### Legal Q&A

This becomes the primary research tool.

Input options:

- query only, using shared corpus
- query + uploaded document, using both corpus and ephemeral document context

Output should include:

- concise answer
- supporting authorities
- document-specific observations when a file is present
- confidence level

### Document Analyzer

This should no longer be limited to summarizing the uploaded document.

It should:

- identify the document's actual language
- compare the language against Indian-law context and common protections
- explain missing, weak, risky, or non-standard provisions
- cite supporting public-law materials where relevant

### Risk Scorer

This should use:

- the uploaded document text
- retrieved public legal context
- curated risk heuristics

The score should reflect both document language and legal/commercial concern patterns grounded in retrieved authorities or predefined policy.

### Clause Extractor

This should still extract clauses from the user document itself, but explanations should be improved using public-corpus retrieval when relevant.

### Plain English

This can stay lighter weight. It may use public retrieval selectively when legal context materially changes the explanation.

### Contract Drafter and NDA Generator

These should no longer rely only on unconstrained LLM drafting.

They should use retrieved public legal context, drafting heuristics, and stronger prompt constraints so outputs are more consistent and jurisdiction-aware.

## Architecture Recommendation

### Deployment Shape

Recommended deployment:

- Frontend on Vercel
- Separate Python backend for retrieval APIs, ingestion, reranking, and corpus management

Reason:

- persistent corpus ingestion and indexing are awkward in serverless-only deployment
- background jobs are needed for updates and reindexing
- retrieval and ranking logic benefits from a more controllable backend runtime

### Backend Responsibilities

The backend should expose:

- user-facing retrieval/query APIs
- ephemeral document analysis APIs
- corpus ingestion jobs
- embedding generation pipeline
- chunking and metadata normalization
- reranking logic

### Storage Responsibilities

Use three storage layers:

1. Raw document storage for public corpus sources
2. Metadata database
3. Vector index

User-uploaded files are explicitly excluded from persistent storage.

## Technology Recommendation

Preferred starting stack:

- Python backend
- PostgreSQL for relational metadata
- `pgvector` or a dedicated vector DB
- object storage for public source documents

For speed to value:

- choose `pgvector` if simpler operations and fewer systems are more important
- choose `Qdrant` if retrieval ergonomics and vector-first workflows are more important

Given the product goal, either is acceptable. The stronger initial recommendation is:

- PostgreSQL + `pgvector` if keeping infra simpler matters most
- Qdrant if retrieval quality iteration is the main priority

## Answer Policy

All answering tools that use public retrieval should produce:

- answer
- cited authorities
- confidence level

Confidence should be based on retrieval evidence, not just model tone.

At minimum confidence should consider:

- retrieval score strength
- agreement across multiple sources
- source type trust level
- whether support comes from the user's document, public corpus, or both

Low-support answers are allowed, but must be clearly labeled.

## Trust and Usefulness Requirements

To be genuinely useful to lawyers and law students, the system must:

- cite sources consistently
- distinguish document facts from legal context
- avoid generic, unsupported legal prose
- keep scope limited to Indian law
- prefer official and authoritative documents during ingestion
- surface uncertainty explicitly

## Non-Goals

Not in initial scope:

- user accounts
- saved user workspaces
- persistent user document history
- private corpus uploads
- multi-jurisdiction support

## Migration Direction From Current App

Current app state:

- Vercel frontend
- Python API
- prompt-driven tools
- in-memory BM25 retrieval only for legal Q&A
- no persistent corpus

Target state:

- frontend remains simple
- backend gains persistent corpus ingestion and hybrid retrieval
- every major legal tool can use public Indian-law retrieval
- uploaded files stay ephemeral

## Immediate Implementation Priorities

1. Remove misleading UI copy like "production-grade".
2. Introduce corpus-aware architecture boundaries in the backend.
3. Add persistent corpus models, ingestion pipeline, and vector retrieval.
4. Keep user document processing ephemeral.
5. Upgrade legal Q&A first, then document analyzer, risk scorer, and clause extractor.
6. Add citation and confidence outputs before broadening tool behavior.
