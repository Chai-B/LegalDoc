"""
LegalDoc API v3 — Indian-law RAG-backed FastAPI backend.
Deployed as a Vercel Python serverless function via Mangum.
"""
import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from typing import Optional

from services.llm_client import call_llm
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

# ── Models ───────────────────────────────────────────────────────────────────

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


# ── Helpers ──────────────────────────────────────────────────────────────────

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


# ── Research endpoint (new RAG-backed) ───────────────────────────────────────

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

    # Build prompt with strict source separation
    prompt_parts = [
        "You are LegalDoc AI — an Indian-law research assistant. Answer the question using the provided sources.",
        "Follow these rules strictly:",
        "1. If a user document is provided, first state what the document says.",
        "2. Then explain the relevant Indian-law legal context from the retrieved authorities.",
        "3. Identify any mismatch, risk, ambiguity, or legal implications.",
        "4. Do NOT silently override or correct the document language — compare and explain.",
        "5. If support is weak, clearly say so.",
        "",
    ]

    if corpus_context:
        prompt_parts.append("Indian-law authorities:\n" + corpus_context)
    else:
        prompt_parts.append("No Indian-law corpus results available. Answer from general legal knowledge, clearly labeled as such.")

    if doc_context:
        prompt_parts.append("\nUser document excerpts:\n" + doc_context)

    prompt_parts.append(f"\nQuestion: {question}")

    prompt = "\n".join(prompt_parts)
    answer = await call_llm(prompt)

    # Compute confidence
    try:
        from services.rerank import score_confidence
        from services.retrieval import hybrid_search
        results = await hybrid_search(question, top_k=5)
        confidence = score_confidence(results)
    except Exception:
        confidence = ConfidenceLevel.LOW if not corpus_context else ConfidenceLevel.MEDIUM

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


# ── Analyze routes ────────────────────────────────────────────────────────────

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
Focus on Indian law. If something is not present, say "Not found in document".
Be specific, concise, and useful for legal review. Do not give generic disclaimers.

Return these sections:
1. Executive Brief — document type, purpose, and business context.
2. Parties and Roles — named parties, capacity, and responsibilities.
3. Key Terms Table — obligation, responsible party, deadline/payment/condition, source clause.
4. Risk Register — high/medium/low risks with quoted trigger language and why it matters.
5. Missing or Weak Protections — important clauses absent or underdeveloped.
6. Negotiation Points — concrete changes a lawyer may request.
7. Follow-up Questions — facts needed from the client before final review.
{corpus_section}

Document:
{text[:10000]}"""
    result = await call_llm(prompt)
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

First line of your response MUST be exactly: RISK_SCORE: [number between 0-100]
(0 = very safe, 100 = extremely risky)

Then provide:
1. Overall Risk Assessment
2. High-Risk Clauses (quote each one, explain the risk)
3. Medium-Risk Areas
4. Missing Standard Protections under Indian law
5. Recommendations
{corpus_section}

Contract:
{text[:10000]}"""
    result = await call_llm(prompt)

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

    prompt = f"""You are an expert Indian-law legal analyst. Extract and categorize all significant clauses.

For each clause found, provide:
- Clause Type (Termination / Indemnity / Payment / Confidentiality / IP / Non-Compete / Jurisdiction / Force Majeure / etc.)
- Direct Quote from document
- Plain English Explanation
- Risk Level: High / Medium / Low
- Key Concerns (if any)
- Indian-Law Note (if relevant legal context exists)
{corpus_section}

Document:
{text[:10000]}"""
    result = await call_llm(prompt)
    return ResultResponse(result=result)


# ── Draft routes ─────────────────────────────────────────────────────────────

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


# ── Understand routes ─────────────────────────────────────────────────────────

@app.post("/api/understand/plain-english", response_model=ResultResponse)
async def plain_english(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=40, label="Legal text")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    prompt = f"""You are a legal translator who makes Indian legal language accessible to non-lawyers.

Translate the following legal text into plain English:

1. Plain English Summary — what this actually means in everyday language
2. Key Points — 3-6 bullet points of what matters most
3. What This Means for You — practical implications under Indian law
4. Watch Out For — any concerning language or missing protections

Legal text:
{text[:5000]}"""
    result = await call_llm(prompt)
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
        "You are a precise Indian-law legal assistant.",
        "Answer the question using the provided sources. If the answer is not in the sources, clearly state that.",
        "Never fabricate information.",
    ]

    if doc_context:
        prompt_parts.append(f"\nUser document excerpts:\n{doc_context}")

    if corpus_context:
        prompt_parts.append(f"\nIndian-law authorities:\n{corpus_context}")

    prompt_parts.append(f"\nQuestion: {question}")
    prompt_parts.append("""
Provide:
1. Direct Answer (concise)
2. Supporting Evidence (quote the relevant parts)
3. Indian-Law Context (if relevant authorities were retrieved)""")

    prompt = "\n".join(prompt_parts)
    result = await call_llm(prompt)
    return ResultResponse(result=result)


# ── Utility routes ────────────────────────────────────────────────────────────

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
