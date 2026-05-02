import os

# Load .env in local development (no-op if file absent or python-dotenv not installed)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from pydantic import BaseModel
from typing import Optional

from services.llm_client import call_llm
from services.key_manager import RateLimitExceeded
from services.rag import build_rag_context
from services.pdf_parser import extract_text_from_docx, extract_text_from_pdf
from services.text_validation import require_text
from schemas import (
    CorpusQueryRequest, CorpusQueryResponse, Citation, ConfidenceLevel,
    AnalysisResponse, RiskAnalysisResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LegalDoc API", version="3.0.0", docs_url="/api/docs")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    wait_secs = round(exc.wait_seconds)
    mins = max(1, round(exc.wait_seconds / 60))
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": str(exc),
            "retry_after_seconds": wait_secs,
            "retry_after_minutes": mins,
        },
    )

class TextRequest(BaseModel):
    text: str

class RiskResponse(BaseModel):
    result: str
    score: int

class DraftRequest(BaseModel):
    description: str
    type: str

class NDARequest(BaseModel):
    party_a: str
    party_b: str
    type: str
    jurisdiction: str
    duration: str
    purpose: str

class QARequest(BaseModel):
    question: str
    document_text: str = ""

class ResultResponse(BaseModel):
    result: str


NOT_INDIAN_LAW = "NOT_INDIAN_LAW"

def _raise_if_non_indian_law(result: str) -> None:
    if result.strip().upper().startswith(NOT_INDIAN_LAW):
        raise HTTPException(status_code=422, detail="non_indian_law_content")


async def _get_corpus_context(query: str, top_k: int = 5) -> tuple[str, list[Citation]]:
    """Attempt corpus retrieval. Returns (context_str, citations). Falls back gracefully."""
    try:
        from services.retrieval import hybrid_search
        from models import ChunkResult
        results = await hybrid_search(query, top_k=top_k)
        if not results:
            return "", []

        context_parts = []
        citations = []
        seen = set()
        for r in results:
            context_parts.append(f"[{r.doc_title} — {r.doc_section_ref}]\n{r.chunk.text}")
            cite_key = (r.doc_title, r.doc_section_ref)
            if cite_key not in seen:
                seen.add(cite_key)
                citations.append(Citation(
                    title=r.doc_title,
                    source_type=r.doc_source_type,
                    authority=r.doc_authority,
                    citation_ref=r.doc_citation,
                    section_ref=r.doc_section_ref,
                    source_url=r.doc_source_url,
                ))
        return "\n\n---\n\n".join(context_parts), citations
    except Exception as e:
        logger.debug(f"Corpus retrieval not available: {e}")
        return "", []



@app.post("/api/research/query", response_model=CorpusQueryResponse)
async def research_query(req: CorpusQueryRequest):
    try:
        question = require_text(req.question, min_chars=5, label="Question")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    corpus_context, citations = await _get_corpus_context(question)

    doc_context = ""
    if req.document_text and len(req.document_text.strip()) > 50:
        doc_context = build_rag_context(req.document_text, question, top_k=5)

    prompt_parts = [
        "You are LegalDoc AI — an Indian-law research assistant.",
        "Answer the question directly and concisely. Only include what the question actually requires.",
        "If the answer is a single sentence, write a single sentence. Don't pad with generic legal warnings.",
        "If the document and the law conflict, note the conflict specifically.",
        "If support is weak or unavailable, say so briefly. Never fabricate.",
        "IMPORTANT: If the question has nothing to do with any legal matter (e.g. it is a greeting, a recipe question, completely off-topic), respond with exactly: NOT_INDIAN_LAW",
        "",
    ]

    if corpus_context:
        prompt_parts.append("Indian-law authorities:\n" + corpus_context)
    else:
        prompt_parts.append("No corpus available. Answer from general Indian legal knowledge — label this clearly.")

    if doc_context:
        prompt_parts.append("\nUser document excerpts:\n" + doc_context)

    prompt_parts.append(f"\nQuestion: {question}")

    prompt = "\n".join(prompt_parts)
    answer = await call_llm(prompt)
    _raise_if_non_indian_law(answer)

    # Compute confidence
    try:
        from services.rerank import score_confidence
        from services.retrieval import hybrid_search
        results = await hybrid_search(question, top_k=5)
        confidence = score_confidence(results)
    except Exception:
        confidence = ConfidenceLevel.MEDIUM if (doc_context or corpus_context) else ConfidenceLevel.LOW

    doc_findings = None
    legal_context_str = None
    if doc_context:
        doc_findings = "Document-specific excerpts were used in the analysis."
    if corpus_context:
        legal_context_str = f"{len(citations)} Indian-law sources retrieved."

    return CorpusQueryResponse(
        answer=answer,
        citations=citations,
        confidence=confidence,
        document_findings=doc_findings,
        legal_context=legal_context_str,
    )



@app.post("/api/analyze/document", response_model=ResultResponse)
async def analyze_document(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=120, label="Document")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    corpus_context, _ = await _get_corpus_context(
        f"Indian law provisions relevant to: {text[:200]}", top_k=3
    )

    corpus_section = ""
    if corpus_context:
        corpus_section = f"""
8. Indian-Law Context — relevant provisions, protections, or common practices from Indian law that apply to this document type.

Indian-law reference material:
{corpus_context}
"""

    prompt = f"""You are a senior legal document reviewer preparing a practical first-pass review for a lawyer.
Focus on Indian law. Be specific and concise — remove filler, don't repeat the document back.

IMPORTANT: If the uploaded text is not a legal document (e.g. it's a recipe, article, personal note, or random text), respond with exactly: NOT_INDIAN_LAW

Use markdown: ## headings, **bold** for terms and risk labels, - bullets, | tables |.
Label risks as **High Risk**, **Medium Risk**, or **Low Risk**.

Include only the sections that have actual content — skip any section where you have nothing meaningful to say:

## 1. Executive Brief
Document type, purpose, key facts.

## 2. Parties and Roles
Named parties and their roles (skip if a one-party document).

## 3. Key Terms Table
| Obligation | Responsible Party | Deadline / Condition | Source Clause |
|---|---|---|---|

## 4. Risk Register
Risks with quoted trigger language. Skip if no significant risks.

## 5. Missing or Weak Protections
Absent or underdeveloped clauses that matter. Skip if protections are solid.

## 6. Negotiation Points
Concrete changes to request. Skip if document is balanced.

## 7. Follow-up Questions
Questions for the client before final review. Skip if none.
{corpus_section}

Document:
{text[:10000]}"""
    result = await call_llm(prompt)
    _raise_if_non_indian_law(result)
    return ResultResponse(result=result)


@app.post("/api/analyze/risk", response_model=RiskResponse)
async def score_risk(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=120, label="Contract")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    corpus_context, _ = await _get_corpus_context(
        f"Indian contract law risk factors: {text[:200]}", top_k=3
    )

    corpus_section = ""
    if corpus_context:
        corpus_section = f"""
Also consider compliance with Indian-law standards based on these references:
{corpus_context}
"""

    prompt = f"""You are an expert contract risk analyst focusing on Indian law.

IMPORTANT: If the text is not a legal contract or legal document, respond with exactly: NOT_INDIAN_LAW

First line MUST be exactly: RISK_SCORE: [number 0-100]
(0 = very safe, 100 = extremely risky)

Use markdown: ## headings, **bold** for clause names and risk labels, - bullets, > for quotes.
Label findings as **High Risk**, **Medium Risk**, or **Low Risk**.

## Risk Score Breakdown
What drove the score — contribution table:
| Risk Factor | Contribution |
|---|---|
*(rows must sum to 100%)*

## Overall Risk Assessment
One concise paragraph on the contract's risk profile under Indian law.

## High-Risk Clauses
Only include if present. For each: **Clause Name** — **High Risk** — quote trigger language, explain why it matters.

## Medium-Risk Areas
Only include if present.

## Missing Standard Protections
Only clauses that are actually absent and genuinely matter for this contract type.

## Recommendations
Numbered, prioritized actions. Skip sections above if there's nothing meaningful to say.
{corpus_section}

Contract:
{text[:10000]}"""
    result = await call_llm(prompt)

    _raise_if_non_indian_law(result)

    score = 50
    for line in result.split('\n')[:3]:
        if 'RISK_SCORE:' in line:
            try:
                score = int(''.join(filter(str.isdigit, line.split(':')[1])))
                score = max(0, min(100, score))
            except (ValueError, IndexError):
                pass

    clean_result = '\n'.join(
        line for line in result.split('\n') if 'RISK_SCORE:' not in line
    ).strip()

    return RiskResponse(result=clean_result, score=score)


@app.post("/api/analyze/clauses", response_model=ResultResponse)
async def extract_clauses(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=120, label="Document")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    corpus_context, _ = await _get_corpus_context(
        f"Indian law clause types and requirements: {text[:200]}", top_k=3
    )

    corpus_section = ""
    if corpus_context:
        corpus_section = f"""
Where relevant, note how each clause compares to Indian legal standards:
{corpus_context}
"""

    prompt = f"""You are an expert Indian-law legal analyst. Extract and categorize significant clauses from the document.

IMPORTANT: If the text is not a legal document, respond with exactly: NOT_INDIAN_LAW

Only include clause types that actually appear in the document — do not invent sections for missing clauses.
Be specific and concise. Quote directly from the document, don't paraphrase what isn't there.

Use markdown. For each found clause:

## [Clause Type] — **[High/Medium/Low Risk]**

> [direct quote from document]

**Plain English:** What this actually means.

**Key Concerns:** (only if there are genuine concerns)
- [specific concern]

**Indian-Law Note:** [only if a specific Indian law applies]

---

Clause types to look for (only include if present): Termination / Indemnity / Payment / Confidentiality / IP / Non-Compete / Jurisdiction / Force Majeure / Governing Law / Dispute Resolution / Liability Cap / Warranty / Representations / Assignment / Amendment / Entire Agreement
{corpus_section}

Document:
{text[:10000]}"""
    result = await call_llm(prompt)
    _raise_if_non_indian_law(result)
    return ResultResponse(result=result)



@app.post("/api/draft/contract", response_model=ResultResponse)
async def draft_contract(req: DraftRequest):
    try:
        description = require_text(req.description, min_chars=40, label="Agreement description")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    contract_type = req.type.strip()
    if not contract_type:
        raise HTTPException(status_code=422, detail="Contract type is required.")

    corpus_context, _ = await _get_corpus_context(
        f"Indian law requirements for {contract_type}", top_k=3
    )

    corpus_section = ""
    if corpus_context:
        corpus_section = f"""
Incorporate relevant Indian-law requirements and standard practices from these references:
{corpus_context}
"""

    prompt = f"""You are an expert Indian contract lawyer. Draft a complete, legally sound {contract_type} agreement governed by Indian law.

IMPORTANT: If the description is not a legal agreement or is completely unrelated to any legal matter, respond with exactly: NOT_INDIAN_LAW

Deal description: {description}

Generate a complete contract with:
- Proper heading and recitals
- Parties section (use [PARTY A] and [PARTY B] as placeholders)
- All standard clauses for this contract type under Indian law
- Clear obligations for each party
- Payment terms (if applicable, use [AMOUNT] placeholder)
- Term and termination provisions
- Dispute resolution clause (reference Indian Arbitration Act if applicable)
- Governing law clause (India)
- Entire agreement, severability, and amendment clauses
- Signature block with date fields

Note: This is a research-informed draft. It should be reviewed by a qualified Indian lawyer before execution.
{corpus_section}

Make it professional, balanced, and immediately usable."""
    result = await call_llm(prompt, max_tokens=3000)
    _raise_if_non_indian_law(result)
    return ResultResponse(result=result)


@app.post("/api/draft/nda", response_model=ResultResponse)
async def generate_nda(req: NDARequest):
    missing = [
        field
        for field, value in {
            "party_a": req.party_a,
            "party_b": req.party_b,
            "type": req.type,
            "jurisdiction": req.jurisdiction,
            "duration": req.duration,
            "purpose": req.purpose,
        }.items()
        if not value.strip()
    ]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required fields: {', '.join(missing)}")
    if req.type not in {"mutual", "one-way"}:
        raise HTTPException(status_code=422, detail="NDA type must be mutual or one-way.")
    try:
        purpose = require_text(req.purpose, min_chars=20, label="Purpose")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    corpus_context, _ = await _get_corpus_context(
        f"Indian law NDA confidentiality requirements {req.jurisdiction}", top_k=3
    )

    corpus_section = ""
    if corpus_context:
        corpus_section = f"""
Incorporate relevant Indian-law NDA provisions from these references:
{corpus_context}
"""

    nda_type = (
        "mutual (both parties share confidential information)"
        if req.type == "mutual"
        else "one-way (only the disclosing party shares confidential information)"
    )
    prompt = f"""Draft a complete, professionally worded Non-Disclosure Agreement (NDA) governed by Indian law.

Details:
- Type: {nda_type}
- Disclosing Party: {req.party_a}
- Receiving Party: {req.party_b}
- Governing Jurisdiction: {req.jurisdiction}
- Duration of Confidentiality: {req.duration}
- Purpose / Context: {purpose}

Include all standard NDA provisions:
1. Recitals and Background
2. Definition of Confidential Information (comprehensive)
3. Obligations of Receiving Party
4. Permitted Disclosures and Exceptions (standard carve-outs)
5. Term and Termination
6. Return or Destruction of Information
7. Injunctive Relief clause
8. No License clause
9. Governing Law and Jurisdiction (Indian law)
10. Entire Agreement
11. Signature block with printed name, title, date fields

Note: This is a research-informed draft. It should be reviewed by a qualified lawyer before execution.
{corpus_section}

Make it immediately usable and professionally formatted."""
    result = await call_llm(prompt, max_tokens=3000)
    return ResultResponse(result=result)



@app.post("/api/understand/plain-english", response_model=ResultResponse)
async def plain_english(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=40, label="Legal text")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    prompt = f"""You are a legal translator making Indian legal language accessible to non-lawyers.

IMPORTANT: If the text is not a legal document or legal provision, respond with exactly: NOT_INDIAN_LAW

Translate the text into plain English. Be as brief as the content warrants.
- For a single clause: one or two paragraphs is enough.
- For a full document: use sections, but only those that add value.
- Use **bold** for key terms and risk labels.
- Label risks as **High Risk**, **Medium Risk**, or **Low Risk** only where they exist.
- Don't pad with generic disclaimers.

Legal text:
{text[:5000]}"""
    result = await call_llm(prompt)
    _raise_if_non_indian_law(result)
    return ResultResponse(result=result)


@app.post("/api/understand/qa", response_model=ResultResponse)
async def legal_qa(req: QARequest):
    try:
        question = require_text(req.question, min_chars=10, label="Question")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Support corpus-only queries (no document required)
    corpus_context, _ = await _get_corpus_context(question, top_k=5)

    doc_context = ""
    if req.document_text and len(req.document_text.strip()) > 50:
        doc_context = build_rag_context(req.document_text, question, top_k=5)

    if not doc_context and not corpus_context:
        # Fallback: require document text when corpus is unavailable
        if not req.document_text or len(req.document_text.strip()) < 120:
            raise HTTPException(
                status_code=422,
                detail="Please provide a document or wait for corpus to be configured."
            )
        doc_context = build_rag_context(req.document_text, question, top_k=5)

    prompt_parts = [
        "You are a precise Indian-law legal assistant in a conversation.",
        "Answer only what was asked. Match the length of the answer to the complexity of the question.",
        "A factual question gets a direct answer. A nuanced question gets explanation. Never pad with generic text.",
        "If the answer isn't in the sources, say so briefly. Never fabricate.",
        "IMPORTANT: If the question has nothing to do with legal matters (e.g. it's off-topic, a greeting, unrelated to law), respond with exactly: NOT_INDIAN_LAW",
    ]

    if doc_context:
        prompt_parts.append(f"\nDocument excerpts:\n{doc_context}")

    if corpus_context:
        prompt_parts.append(f"\nIndian-law references:\n{corpus_context}")

    prompt_parts.append(f"\nQuestion: {question}")

    prompt = "\n".join(prompt_parts)
    result = await call_llm(prompt)
    _raise_if_non_indian_law(result)
    return ResultResponse(result=result)



@app.post("/api/extract-file")
async def extract_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10MB.")

    name = file.filename.lower()
    if name.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    elif name.endswith(".docx"):
        text = extract_text_from_docx(content)
    elif name.endswith(".txt"):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1", errors="ignore")
    else:
        raise HTTPException(status_code=400, detail="Supported formats are PDF, DOCX, and TXT.")

    if len(text.strip()) < 40:
        raise HTTPException(status_code=422, detail="No useful text could be extracted from this file.")

    return {"text": text, "length": len(text)}


@app.get("/api/keys/status")
async def keys_status():
    from services.key_manager import get_manager
    manager = get_manager()
    return {
        "total_keys": len(manager.slots),
        "available_keys": sum(1 for s in manager.slots if s.available),
        "all_locked": manager.all_locked(),
        "min_wait_seconds": round(manager.min_wait_seconds()),
        "keys": manager.status(),
    }


@app.get("/api/health")
async def health():
    from config import has_database, has_embeddings
    return {
        "status": "ok",
        "version": "3.0.0",
        "auth": "none",
        "corpus_db": has_database(),
        "embeddings": has_embeddings(),
    }


@app.get("/")
async def root():
    return {"message": "LegalDoc API v3", "docs": "/api/docs"}


# Vercel serverless handler
handler = Mangum(app, lifespan="off")
