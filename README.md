<div align="center">

<img src="public/favicon.svg" alt="LegalDoc" width="72" height="72" />

# LegalDoc

**AI-powered legal workbench for Indian law**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai)](https://openai.com)

</div>

---

LegalDoc is a stateless, browser-first AI legal workbench built for Indian law practitioners, business owners, and anyone who needs to understand, draft, or review legal documents. Seven specialized tools, a hybrid RAG backend grounded in Indian legal authorities, and a clean dark interface designed for professional use.

---

## Tools

### Analyze

**Document Analyzer** — Upload any legal document and get a lawyer-oriented first-pass review: key facts, obligations, risks, missing protections, and negotiation leverage points. Includes a clickable risk register, quick insights sidebar, and feature chips that jump directly to the relevant section in the output.

**Risk Scorer** — Scores your contract from 0 (safe) to 100 (high risk). Produces a clause-by-clause breakdown with plain-English explanations and a contribution table showing what percentage each risk factor added to the total score. Color-coded score badge (green / amber / red) with an animated progress bar.

**Clause Extractor** — Extracts and categorizes every clause in your document — termination, indemnity, payment, IP, non-compete, governing law, jurisdiction, force majeure, and more. Each clause is labeled and explained in plain English.

### Draft

**Contract Drafter** — Generates a complete, jurisdiction-aware contract draft from a short description. Supports employment agreements, service contracts, NDAs, licensing agreements, and more. Output includes all standard clauses plus optional Indian-law-specific provisions.

**NDA Generator** — Produces a customized non-disclosure agreement from party names, purpose, and key terms. Covers mutual and one-way NDAs, standard exclusions, and dispute resolution under Indian law.

### Understand

**Legal Q&A** — Ask any question about Indian law or your uploaded document. Answers are grounded in a hybrid RAG corpus of Indian statutes, case law, and legal authorities. Returns citations with confidence scoring so you always know the basis for each answer.

**Plain English** — Converts dense legal language into plain English. Paste any clause, section, or full document and get a jargon-free explanation of what it actually means and what you're agreeing to.

---

## Architecture

```
┌─────────────────────────────────────┐
│           Next.js 14 (Vercel)       │
│                                     │
│  App Router · React 18 · TS strict  │
│  7 tool pages · shared components   │
│  localStorage cross-tool doc sync   │
│  Custom markdown renderer (no deps) │
│  jsPDF beautified downloads         │
└──────────────────┬──────────────────┘
                   │ API calls
┌──────────────────▼──────────────────┐
│          FastAPI (Render)           │
│                                     │
│  Mangum serverless adapter          │
│  Hybrid retrieval: BM25 + pgvector  │
│  OpenAI GPT-4o generation           │
│  Confidence scoring + citations     │
│  PDF text extraction (pypdf)        │
└─────────────────────────────────────┘
```

**Frontend**
- Next.js 14 App Router with React Server Components where possible
- All tool pages are client components (file handling, state, streaming)
- `localStorage` document store — upload once, use across all tools without re-uploading
- Custom block + inline markdown renderer — no external library, no ESM/CJS issues
- `forwardRef` + `useImperativeHandle` for cross-component scroll targeting
- `framer-motion` for score badge and panel transitions
- `jsPDF` for title-page, bookmarked, highlighted PDF downloads
- Tailwind CSS v3 · shadcn/ui components

**Backend**
- FastAPI with Pydantic request/response models throughout
- Hybrid retrieval: BM25 (keyword) + pgvector (semantic) with RRF score fusion
- OpenAI `text-embedding-3-small` for embeddings, `gpt-4o` for generation
- `pypdf` for server-side PDF text extraction
- `rank-bm25` for keyword index
- Structured confidence scoring (high / medium / low) based on retrieval quality
- Citation extraction with source metadata

---

## Features

- **Native PDF viewing** — uploaded PDFs render as the original document (not converted to text), with AI-detected important sentences highlighted in gold and blue
- **User highlights** — select any text in the AI output to highlight it; highlights persist across downloads
- **Beautified PDF export** — title page, table of contents, blue accent headings, colored bullet points, blockquote bars, highlight legend, page numbers — not a print dialog
- **Word (.doc) export** — user highlights rendered as `<mark>` tags
- **Quick insights** — clickable sentence-level summary cards that scroll to and flash the relevant section in the full output
- **Scroll-to-section** — feature chips and insights use `data-section` attributes for reliable cross-element targeting
- **Risk contribution table** — risk scorer always shows a markdown table breaking down what percentage each factor contributed
- **Cross-tool document persistence** — document state synced via `localStorage`; switching tabs preserves the loaded document
- **Clear output** — trash button on every result panel; each tool has independent clear/reset

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL with `pgvector` extension
- OpenAI API key

### Frontend

```bash
cd legaldoc1
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend

```bash
cd api
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `api/.env`:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@host:5432/legaldoc
```

```bash
uvicorn index:app --reload --port 8000
```

The frontend proxies `/api/*` to `http://localhost:8000` via `next.config.js` rewrites.

### Environment Variables (Frontend)

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL.

---

## Deployment

**Frontend → Vercel**

Push the repo to GitHub and import into Vercel. Set `NEXT_PUBLIC_API_URL` in Vercel environment variables pointing to your backend.

**Backend → Render**

The `render.yaml` in the repo root configures a Python web service. Set the environment variables in Render's dashboard.

```yaml
# render.yaml (already in repo)
services:
  - type: web
    name: legaldoc-api
    runtime: python
    buildCommand: pip install -r api/requirements.txt
    startCommand: uvicorn api.index:app --host 0.0.0.0 --port $PORT
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict), Python 3.11 |
| Styling | Tailwind CSS v3, shadcn/ui |
| Animation | framer-motion |
| PDF export | jsPDF |
| Backend | FastAPI + Mangum |
| LLM | OpenAI GPT-4o |
| Embeddings | text-embedding-3-small |
| Vector DB | PostgreSQL + pgvector |
| Keyword search | rank-bm25 |
| PDF parsing | pypdf |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
legaldoc1/
├── app/
│   ├── dashboard/          # 7-tool bento grid landing
│   └── tools/
│       ├── document-analyzer/
│       ├── risk-scorer/
│       ├── clause-extractor/
│       ├── contract-drafter/
│       ├── nda-generator/
│       ├── legal-qa/
│       └── plain-english/
├── components/
│   ├── layout/             # Navbar, Logo, Footer
│   └── tools/              # Shared tool components
│       ├── document-viewer.tsx   # Markdown renderer + highlights
│       ├── result-panel.tsx      # Output panel + downloads
│       ├── source-viewer.tsx     # Original doc with AI highlights
│       ├── quick-insights.tsx    # Clickable insight cards
│       ├── tool-layout.tsx       # Two-panel shell + tab nav
│       ├── tool-tabs.tsx         # Horizontal tool navigation
│       └── file-upload.tsx       # Drag-and-drop, PDF/DOCX/TXT
├── lib/
│   ├── api.ts              # Typed API client
│   ├── document-store.ts   # localStorage persistence
│   └── pdf-generator.ts    # jsPDF beautified export
└── api/
    ├── index.py            # FastAPI app, all endpoints
    └── requirements.txt
```

---

## Legal Disclaimer

LegalDoc is a legal research and drafting aid. It does not constitute legal advice. Outputs should be reviewed by a qualified legal professional before being relied upon for any purpose. The tool is designed for use within Indian legal jurisdiction.

---

<div align="center">

Built for Indian law · Powered by GPT-4o · Deployed on Vercel + Render

</div>
