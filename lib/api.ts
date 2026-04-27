const API = process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
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
