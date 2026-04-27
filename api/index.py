"""
LegalDoc API v2 — Stateless, auth-free FastAPI backend.
Deployed as a Vercel Python serverless function via Mangum.
"""
import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel

from services.llm_client import call_llm
from services.rag import build_rag_context
from services.pdf_parser import extract_text_from_docx, extract_text_from_pdf
from services.text_validation import require_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LegalDoc API", version="2.0.0", docs_url="/api/docs")

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
    type: str          # "mutual" | "one-way"
    jurisdiction: str
    duration: str
    purpose: str

class QARequest(BaseModel):
    question: str
    document_text: str

class ResultResponse(BaseModel):
    result: str

# ── Analyze routes ────────────────────────────────────────────────────────────

@app.post("/api/analyze/document", response_model=ResultResponse)
async def analyze_document(req: TextRequest):
    try:
        text = require_text(req.text, min_chars=120, label="Document")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    prompt = f"""You are a senior legal document reviewer preparing a practical first-pass review for a lawyer.

Use only the document text. If something is not present, say "Not found in document".
Be specific, concise, and useful for legal review. Do not give generic disclaimers.

Return these sections:
1. Executive Brief — document type, purpose, and business context.
2. Parties and Roles — named parties, capacity, and responsibilities.
3. Key Terms Table — obligation, responsible party, deadline/payment/condition, source clause.
4. Risk Register — high/medium/low risks with quoted trigger language and why it matters.
5. Missing or Weak Protections — important clauses absent or underdeveloped.
6. Negotiation Points — concrete changes a lawyer may request.
7. Follow-up Questions — facts needed from the client before final review.

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

    prompt = f"""You are an expert contract risk analyst.

First line of your response MUST be exactly: RISK_SCORE: [number between 0-100]
(0 = very safe, 100 = extremely risky)

Then provide:
1. Overall Risk Assessment
2. High-Risk Clauses (quote each one, explain the risk)
3. Medium-Risk Areas
4. Missing Standard Protections
5. Recommendations

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

    prompt = f"""You are an expert legal analyst. Extract and categorize all significant clauses.

For each clause found, provide:
- Clause Type (Termination / Indemnity / Payment / Confidentiality / IP / Non-Compete / Jurisdiction / Force Majeure / etc.)
- Direct Quote from document
- Plain English Explanation
- Risk Level: High / Medium / Low
- Key Concerns (if any)

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

    prompt = f"""You are an expert contract lawyer. Draft a complete, legally sound {contract_type} agreement.

Deal description: {description}

Generate a complete contract with:
- Proper heading and recitals
- Parties section (use [PARTY A] and [PARTY B] as placeholders)
- All standard clauses for this contract type
- Clear obligations for each party
- Payment terms (if applicable, use [AMOUNT] placeholder)
- Term and termination provisions
- Dispute resolution clause
- Governing law clause
- Entire agreement, severability, and amendment clauses
- Signature block with date fields

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

    nda_type = (
        "mutual (both parties share confidential information)"
        if req.type == "mutual"
        else "one-way (only the disclosing party shares confidential information)"
    )
    prompt = f"""Draft a complete, professionally worded Non-Disclosure Agreement (NDA).

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
9. Governing Law and Jurisdiction
10. Entire Agreement
11. Signature block with printed name, title, date fields

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

    prompt = f"""You are a legal translator who makes legal language accessible to non-lawyers.

Translate the following legal text into plain English:

1. Plain English Summary — what this actually means in everyday language
2. Key Points — 3-6 bullet points of what matters most
3. What This Means for You — practical implications
4. Watch Out For — any concerning language or missing protections

Legal text:
{text[:5000]}"""
    result = await call_llm(prompt)
    return ResultResponse(result=result)


@app.post("/api/understand/qa", response_model=ResultResponse)
async def legal_qa(req: QARequest):
    try:
        document_text = require_text(req.document_text, min_chars=120, label="Document")
        question = require_text(req.question, min_chars=10, label="Question")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    context = build_rag_context(document_text, question, top_k=5)
    prompt = f"""You are a precise legal assistant. Answer the question using ONLY the document excerpts provided.

If the answer is not in the document, clearly state that. Never fabricate information.

Relevant document excerpts:
{context}

Question: {question}

Provide:
1. Direct Answer (concise)
2. Supporting Evidence (quote the relevant parts verbatim)
3. Additional Context (from the document, if helpful)"""
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
    return {"status": "ok", "version": "2.0.0", "auth": "none"}


@app.get("/")
async def root():
    return {"message": "LegalDoc API v2", "docs": "/api/docs"}


# Vercel serverless handler
handler = Mangum(app, lifespan="off")
