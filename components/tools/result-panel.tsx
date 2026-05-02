'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, CheckCheck, Loader2, Scale, Download, ChevronDown, FileText, File, Trash2, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CitationList } from '@/components/tools/citation-list'
import { ConfidenceBadge } from '@/components/tools/confidence-badge'
import { DocumentViewer, DocumentViewerRef } from '@/components/tools/document-viewer'
import type { Highlight } from '@/components/tools/document-viewer'
import { cn } from '@/lib/utils'
import type { Citation, ConfidenceLevel } from '@/lib/api'

interface ResultPanelProps {
  result: string | null
  loading: boolean
  placeholder?: string
  className?: string
  citations?: Citation[]
  confidence?: ConfidenceLevel
  onClear?: () => void
  viewerRef?: React.RefObject<DocumentViewerRef>
  toolName?: string
}

function parseRgba(rgba: string): { r: number; g: number; b: number } {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : { r: 253, g: 224, b: 71 }
}


function markdownToHTMLBody(md: string, highlights: Highlight[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function inline(s: string): string {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
  }

  function withHighlight(htmlContent: string, plainText: string): string {
    const np = norm(plainText)
    for (const h of highlights) {
      const nh = norm(h.text)
      if (np === nh || np.includes(nh) || (nh.includes(np) && np.length > 3)) {
        const { r, g, b } = parseRgba(h.color)
        return `<mark style="background:rgba(${r},${g},${b},0.55);border-radius:3pt;padding:1pt 3pt">${htmlContent}</mark>`
      }
    }
    return htmlContent
  }

  const lines = md.split('\n')
  const parts: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()

    if (!t) { i++; continue }

    // Fenced code block
    if (t.startsWith('```')) {
      i++
      const code: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++ }
      i++
      parts.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
      continue
    }

    // Headings
    const h1 = t.match(/^# (.+)$/)
    if (h1) { parts.push(`<h1>${inline(h1[1])}</h1>`); i++; continue }
    const h2 = t.match(/^## (.+)$/)
    if (h2) { parts.push(`<h2>${inline(h2[1])}</h2>`); i++; continue }
    const h3 = t.match(/^### (.+)$/)
    if (h3) { parts.push(`<h3>${inline(h3[1])}</h3>`); i++; continue }

    // HR
    if (/^(---+|\*\*\*+)$/.test(t)) { parts.push('<hr>'); i++; continue }

    // Blockquote
    if (t.startsWith('> ')) {
      const qLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        qLines.push(lines[i].trim().slice(2)); i++
      }
      const raw = qLines.join(' ')
      parts.push(`<blockquote>${withHighlight(inline(raw), raw)}</blockquote>`)
      continue
    }

    // Table
    if (t.startsWith('|') && t.endsWith('|')) {
      const tLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tLines.push(lines[i].trim()); i++ }
      const isSep = (r: string) => /^[\s|:\-]+$/.test(r)
      const filtered = tLines.filter((r, idx) => !(idx === 1 && isSep(r)))
      const split = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
      if (filtered.length >= 2) {
        const headers = split(filtered[0])
        const rows = filtered.slice(1).map(split)
        let table = '<table><thead><tr>'
        headers.forEach(h => { table += `<th>${inline(h)}</th>` })
        table += '</tr></thead><tbody>'
        rows.forEach(row => {
          table += '<tr>'
          row.forEach(cell => { table += `<td>${inline(cell)}</td>` })
          table += '</tr>'
        })
        table += '</tbody></table>'
        parts.push(table)
      }
      continue
    }

    // Unordered list
    if (/^[-*•]\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, '')); i++
      }
      parts.push('<ul>' + items.map(it => `<li>${withHighlight(inline(it), it)}</li>`).join('') + '</ul>')
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++
      }
      parts.push('<ol>' + items.map(it => `<li>${withHighlight(inline(it), it)}</li>`).join('') + '</ol>')
      continue
    }

    // Paragraph
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---+|\*\*\*+)$/.test(lines[i].trim())
    ) { paraLines.push(lines[i].trim()); i++ }
    if (paraLines.length) {
      const raw = paraLines.join(' ')
      parts.push(`<p>${withHighlight(inline(raw), raw)}</p>`)
    }
  }

  return parts.join('\n')
}

function downloadDOCX(result: string, highlights: Highlight[], filename: string) {
  const body = markdownToHTMLBody(result, highlights)
  // Colour logic matching the PDF / webapp: section-aware H2 colours on white
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
  xmlns:w='urn:schemas-microsoft-com:office:word'
  xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>
  body { font-family: "Aptos", Calibri, sans-serif; font-size: 10.5pt; line-height: 1.75; margin: 1in; color: #111111; }
  h1 { font-size: 16pt; font-weight: bold; color: #1d4ed8; margin: 20pt 0 6pt; border-bottom: 1.5pt solid #1d4ed8; padding-bottom: 3pt; }
  h2 { font-size: 13pt; font-weight: bold; color: #1d4ed8; margin: 16pt 0 5pt; border-bottom: 0.5pt solid #1d4ed8; padding-bottom: 2pt; }
  h3 { font-size: 11pt; font-weight: bold; color: #111; margin: 12pt 0 4pt; border-left: 2pt solid #1d4ed8; padding-left: 6pt; }
  p { margin: 0 0 7pt; color: #333; }
  li { margin: 3pt 0; color: #333; }
  ul { padding-left: 18pt; list-style-type: disc; }
  ol { padding-left: 18pt; list-style-type: decimal; }
  blockquote { margin: 8pt 0 8pt 0; color: #555; font-style: italic; border-left: 3pt solid #1d4ed8; padding-left: 10pt; background: #eff6ff; }
  code { font-family: "Cascadia Code", "Courier New", monospace; font-size: 9pt; background: #f3f4f6; padding: 1pt 3pt; }
  pre { font-family: "Cascadia Code", "Courier New", monospace; font-size: 8.5pt; background: #f3f4f6; padding: 8pt; margin: 8pt 0; }
  strong { font-weight: bold; color: #111; }
  em { font-style: italic; }
  hr { border: none; border-top: 0.5pt solid #d1d5db; margin: 12pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  th { background: #1e3a8a; color: white; font-weight: bold; padding: 5pt 8pt; border: 0.5pt solid #1e3a8a; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5pt 8pt; border: 0.5pt solid #cbd5e1; font-size: 9.5pt; }
  tr:nth-child(even) td { background: #f8faff; }
  mark { border-radius: 3pt; padding: 1pt 3pt; }
</style></head>
<body>
<p style="color:#6b7280;font-size:7.5pt;margin-bottom:16pt;border-bottom:0.5pt solid #e5e7eb;padding-bottom:8pt">
  LegalDoc &nbsp;·&nbsp; ${filename.replace(/_/g, ' ')} &nbsp;·&nbsp; AI-generated, for informational purposes only
</p>
${body}
</body></html>`

  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadTXT(result: string, filename: string) {
  const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function ResultPanel({
  result,
  loading,
  placeholder,
  className,
  citations,
  confidence,
  onClear,
  viewerRef,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const internalRef = useRef<DocumentViewerRef>(null)
  const activeRef = viewerRef ?? internalRef

  const displayContent = editedContent ?? result

  const copy = async () => {
    if (!displayContent) return
    await navigator.clipboard.writeText(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addHighlight = (h: Highlight) => setHighlights(prev => [...prev, h])
  const clearHighlights = () => setHighlights([])

  const handleClearOutput = () => {
    setHighlights([])
    setEditMode(false)
    setEditedContent(null)
    onClear?.()
  }

  const handleEditToggle = () => {
    if (!editMode) {
      setEditedContent(displayContent)
      setEditMode(true)
    } else {
      setEditMode(false)
    }
  }

  const handlePDFDownload = async () => {
    if (!displayContent) return
    setDownloadOpen(false)
    try {
      const { generatePDF, generateFilename } = await import('@/lib/pdf-generator')
      const filename = generateFilename(displayContent)
      await generatePDF(displayContent, highlights, filename)
    } catch (e) {
      console.error('PDF generation failed', e)
    }
  }

  return (
    <div
      className={cn(
        'rounded-[18px] macos-card flex flex-col overflow-hidden min-h-[560px]',
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-separator flex-shrink-0 bg-surface/70">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-accent"
            style={{ animation: loading ? 'pulse 1s ease-in-out infinite' : 'none' }}
          />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Review Output</span>
          {confidence && result && <ConfidenceBadge level={confidence} className="ml-2" />}
        </div>

        {displayContent && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearOutput}
              className="inline-flex items-center gap-1.5 text-[11px] h-7 px-2.5 rounded-md text-muted hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
              title="Clear output"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={handleEditToggle}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] h-7 px-2.5 rounded-md border transition-all font-medium',
                editMode
                  ? 'bg-teal/10 text-teal border-teal/30 hover:bg-teal/15'
                  : 'bg-white/[0.04] border-separator text-muted hover:text-foreground hover:border-card-border-hover'
              )}
              title={editMode ? 'Save edits' : 'Edit output'}
            >
              {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editMode ? 'Done' : 'Edit'}
            </button>

            <div className="relative">
              <button
                onClick={() => setDownloadOpen(v => !v)}
                onBlur={() => setTimeout(() => setDownloadOpen(false), 150)}
                className="inline-flex items-center gap-1.5 text-[11px] h-7 px-2.5 rounded-md bg-white/[0.04] border border-separator text-muted hover:text-foreground hover:border-card-border-hover transition-all font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              <AnimatePresence>
                {downloadOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-separator bg-[#141414] shadow-xl overflow-hidden z-20"
                  >
                    {[
                      { label: 'PDF', icon: File, action: handlePDFDownload },
                      {
                        label: 'Word (.docx)', icon: FileText, action: async () => {
                          const { generateFilename } = await import('@/lib/pdf-generator')
                          downloadDOCX(displayContent, highlights, generateFilename(displayContent))
                          setDownloadOpen(false)
                        }
                      },
                      {
                        label: 'Plain Text (.txt)', icon: FileText, action: async () => {
                          const { generateFilename } = await import('@/lib/pdf-generator')
                          downloadTXT(displayContent, generateFilename(displayContent))
                          setDownloadOpen(false)
                        }
                      },
                    ].map(({ label, icon: Icon, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-foreground/80 hover:bg-white/[0.06] hover:text-foreground transition-colors text-left"
                      >
                        <Icon className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5 text-xs h-7 px-2">
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-5 py-16 text-center"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-[14px] bg-white/[0.04] border border-card-border-hover flex items-center justify-center">
                  <Scale className="w-6 h-6 text-accent" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Building legal review…</p>
                <p className="text-xs text-muted">Usually takes 5–20 seconds</p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {[75, 55, 85, 45].map((w, i) => (
                  <motion.div
                    key={i}
                    className="h-2 rounded-full bg-white/[0.055]"
                    style={{ width: `${w}%` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.4, delay: i * 0.18, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          ) : displayContent ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {editMode ? (
                <textarea
                  value={editedContent ?? ''}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full min-h-[400px] bg-white/[0.03] border border-separator rounded-xl p-4 text-[13px] text-foreground/85 leading-7 font-mono resize-y focus:outline-none focus:border-accent/40"
                  spellCheck={false}
                />
              ) : (
                <DocumentViewer
                  ref={activeRef}
                  content={displayContent}
                  highlights={highlights}
                  onAddHighlight={addHighlight}
                  onClearHighlights={clearHighlights}
                />
              )}
              {!editMode && citations && citations.length > 0 && (
                <CitationList citations={citations} className="pt-4 border-t border-separator" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center gap-3 text-center py-16"
            >
              <div className="w-14 h-14 rounded-[14px] bg-white/[0.035] border border-card-border flex items-center justify-center">
                <Scale className="w-6 h-6 text-muted" />
              </div>
              <div>
                <p className="text-sm text-muted">{placeholder || 'Output will appear here'}</p>
                <p className="text-xs text-muted-dark mt-1">Submit your input to get started</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
