const API = process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')

export class RateLimitError extends Error {
  retryAfterSeconds: number
  retryAfterMinutes: number

  constructor(message: string, retryAfterSeconds: number, retryAfterMinutes: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
    this.retryAfterMinutes = retryAfterMinutes
  }
}

export class NonIndianLawError extends Error {
  constructor() {
    super('non_indian_law_content')
    this.name = 'NonIndianLawError'
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))

    if (res.status === 429) {
      const secs: number = err.retry_after_seconds ?? 60
      const mins: number = err.retry_after_minutes ?? Math.max(1, Math.ceil(secs / 60))
      const msg: string = err.message || `All API keys are rate-limited. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.`
      throw new RateLimitError(msg, secs, mins)
    }

    if (res.status === 422 && err.detail === 'non_indian_law_content') {
      throw new NonIndianLawError()
    }

    throw new Error(err.detail || err.message || 'Request failed')
  }

  return res.json()
}

export interface Citation {
  title: string
  source_type: string
  authority: string
  citation_ref: string
  section_ref: string
  source_url: string
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface CorpusQueryResponse {
  answer: string
  citations: Citation[]
  confidence: ConfidenceLevel
  document_findings: string | null
  legal_context: string | null
}

export const api = {
  analyzeDocument: (text: string) =>
    post<{ result: string }>('/api/analyze/document', { text }),

  scoreRisk: (text: string) =>
    post<{ result: string; score: number }>('/api/analyze/risk', { text }),

  extractClauses: (text: string) =>
    post<{ result: string }>('/api/analyze/clauses', { text }),

  draftContract: (description: string, type: string) =>
    post<{ result: string }>('/api/draft/contract', { description, type }),

  generateNDA: (params: {
    party_a: string
    party_b: string
    type: 'mutual' | 'one-way'
    jurisdiction: string
    duration: string
    purpose: string
  }) => post<{ result: string }>('/api/draft/nda', params),

  plainEnglish: (text: string) =>
    post<{ result: string }>('/api/understand/plain-english', { text }),

  legalQA: (question: string, documentText: string) =>
    post<{ result: string }>('/api/understand/qa', { question, document_text: documentText }),

  researchQuery: (question: string, documentText?: string) =>
    post<CorpusQueryResponse>('/api/research/query', {
      question,
      document_text: documentText || null,
    }),

  extractFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${API}/api/extract-file`, { method: 'POST', body: form })
      .then(async (r) => {
        const data = await r.json().catch(() => ({ detail: 'File extraction failed' }))
        if (!r.ok) throw new Error(data.detail || 'File extraction failed')
        return data as { text: string }
      })
  },
}
