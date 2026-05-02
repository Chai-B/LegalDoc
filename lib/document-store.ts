const KEY = 'legaldoc_doc'

export interface StoredDocument {
  text: string
  fileName: string
}

export function saveDocument(doc: StoredDocument): void {
  try {
    const json = JSON.stringify(doc)
    if (json.length < 2 * 1024 * 1024) {
      localStorage.setItem(KEY, json)
    }
  } catch {}
}

export function loadDocument(): StoredDocument | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredDocument) : null
  } catch {
    return null
  }
}

export function clearDocument(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

export function registerUnloadClear(): () => void {
  const handler = () => clearDocument()
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}
