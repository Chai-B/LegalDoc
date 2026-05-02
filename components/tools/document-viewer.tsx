'use client'

import { useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import { Highlighter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Highlight {
  id: string
  text: string
  color: string
}

export interface DocumentViewerRef {
  scrollToText: (text: string) => void
}

export const HIGHLIGHT_COLORS = [
  { label: 'Yellow', bg: 'rgba(253,224,71,0.55)', dot: '#fde047' },
  { label: 'Blue',   bg: 'rgba(96,165,250,0.45)',  dot: '#60a5fa' },
  { label: 'Green',  bg: 'rgba(52,211,153,0.4)',   dot: '#34d399' },
  { label: 'Pink',   bg: 'rgba(249,168,212,0.5)',  dot: '#f9a8d4' },
]

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function applyTextHighlights(
  text: string,
  key: string,
  highlights: Highlight[]
): React.ReactNode[] {
  if (!text) return []

  const nt = norm(text)

  // If this element is fully contained within a multi-element highlight, highlight the whole thing
  const containerHL = highlights.find(h => {
    const nh = norm(h.text)
    return nt.length > 2 && nh.length > nt.length && nh.includes(nt)
  })
  if (containerHL) {
    return [
      <mark key={key} style={{ background: containerHL.color, borderRadius: '4px', padding: '1px 3px' }}>
        {text}
      </mark>
    ]
  }

  // Exact / substring match for direct (single-element) highlights
  const exactHL = highlights.find(h => {
    const nh = norm(h.text)
    return nt === nh || nt.includes(nh) || nh.includes(nt)
  })

  const autoPats = [
    'High[\\s\\-]?Risk|HIGH[\\s\\-]?RISK',
    'Medium[\\s\\-]?Risk|MEDIUM[\\s\\-]?RISK|Moderate[\\s\\-]?Risk',
    'Low[\\s\\-]?Risk|LOW[\\s\\-]?RISK',
  ]

  const hlPats = exactHL
    ? [exactHL.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')]
    : highlights.map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean)

  const allPats = [...hlPats, ...autoPats]
  const combined = new RegExp(`(${allPats.join('|')})`, 'gi')
  const parts = text.split(combined).filter(p => p != null)

  return parts.map((part, i) => {
    if (!part) return null
    const k = `${key}-t${i}`

    const matchHL = highlights.find(h => {
      const nh = norm(h.text)
      const np = norm(part)
      return np === nh || (np.length > 3 && (nh.includes(np) || np.includes(nh)))
    })
    if (matchHL) {
      return (
        <mark key={k} style={{ background: matchHL.color, borderRadius: '4px', padding: '1px 3px' }}>
          {part}
        </mark>
      )
    }

    if (/^(High[\s\-]?Risk|HIGH[\s\-]?RISK)$/i.test(part)) {
      return <mark key={k} style={{ background: 'rgba(239,68,68,0.2)', color: 'rgb(252,165,165)', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>{part}</mark>
    }
    if (/^(Medium[\s\-]?Risk|MEDIUM[\s\-]?RISK|Moderate[\s\-]?Risk)$/i.test(part)) {
      return <mark key={k} style={{ background: 'rgba(168,85,247,0.2)', color: 'rgb(216,180,254)', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>{part}</mark>
    }
    if (/^(Low[\s\-]?Risk|LOW[\s\-]?RISK)$/i.test(part)) {
      return <mark key={k} style={{ background: 'rgba(52,211,153,0.18)', color: 'rgb(110,231,183)', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>{part}</mark>
    }

    return <span key={k}>{part}</span>
  }).filter(Boolean) as React.ReactNode[]
}

function renderInline(
  text: string,
  key: string,
  highlights: Highlight[]
): React.ReactNode {
  if (!text) return null

  const fmtPat = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g
  const fmtParts = text.split(fmtPat).filter(p => p != null)
  const nodes: React.ReactNode[] = []

  fmtParts.forEach((part, i) => {
    if (!part) return
    const k = `${key}-f${i}`

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2)
      const matchHL = highlights.find(h => {
        const nh = norm(h.text)
        const ni = norm(inner)
        return ni === nh || (ni.length > 3 && (nh.includes(ni) || ni.includes(nh)))
      })
      if (matchHL) {
        nodes.push(
          <mark key={k} style={{ background: matchHL.color, borderRadius: '4px', padding: '1px 3px' }}>
            <strong className="font-semibold text-foreground">{inner}</strong>
          </mark>
        )
      } else {
        nodes.push(<strong key={k} className="font-semibold text-foreground">{inner}</strong>)
      }
      return
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={k} className="italic text-foreground/80">{part.slice(1, -1)}</em>)
      return
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code key={k} className="bg-white/[0.08] rounded px-1.5 py-0.5 text-[11px] font-mono text-accent">
          {part.slice(1, -1)}
        </code>
      )
      return
    }

    const hlNodes = applyTextHighlights(part, k, highlights)
    nodes.push(...hlNodes)
  })

  if (nodes.length === 0) return null
  if (nodes.length === 1) return nodes[0]
  return <>{nodes}</>
}

function riskCellStyle(cell: string): React.CSSProperties {
  const lower = cell.toLowerCase()
  if (/high/i.test(lower) && /risk/i.test(lower)) return { color: 'rgb(252,165,165)', fontWeight: 600 }
  if (/medium|moderate/i.test(lower) && /risk/i.test(lower)) return { color: 'rgb(216,180,254)', fontWeight: 600 }
  if (/low/i.test(lower) && /risk/i.test(lower)) return { color: 'rgb(110,231,183)', fontWeight: 600 }
  return {}
}

function parseMarkdown(content: string, highlights: Highlight[]): React.ReactNode[] {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { i++; continue }

    if (trimmed.startsWith('```')) {
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      nodes.push(
        <pre key={key++} className="bg-white/[0.04] rounded-xl p-4 overflow-x-auto my-4 border border-separator">
          <code className="text-[11px] font-mono text-foreground/75 leading-5">{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    const h3 = trimmed.match(/^### (.+)$/)
    if (h3) {
      const k = String(key++)
      nodes.push(
        <h3 key={k} data-section={h3[1].toLowerCase()} className="text-[13px] font-semibold text-foreground/95 mt-6 mb-2 tracking-tight pl-3 border-l-2 border-accent/40">
          {renderInline(h3[1], `h3-${k}`, highlights)}
        </h3>
      )
      i++; continue
    }

    const h2 = trimmed.match(/^## (.+)$/)
    if (h2) {
      const k = String(key++)
      const lower = h2[1].toLowerCase()
      const borderColor = lower.includes('risk') || lower.includes('danger') || lower.includes('critical')
        ? 'border-red-400/60'
        : lower.includes('missing') || lower.includes('weak') || lower.includes('concern')
          ? 'border-iris/60'
          : lower.includes('recommend') || lower.includes('negotiat') || lower.includes('insight')
            ? 'border-teal/60'
            : 'border-accent/50'
      nodes.push(
        <h2 key={k} data-section={h2[1].toLowerCase()} className={`text-[15px] font-semibold text-foreground mt-7 mb-2.5 pb-2 border-b tracking-tight ${borderColor}`}>
          {renderInline(h2[1], `h2-${k}`, highlights)}
        </h2>
      )
      i++; continue
    }

    const h1 = trimmed.match(/^# (.+)$/)
    if (h1) {
      const k = String(key++)
      nodes.push(
        <h1 key={k} data-section={h1[1].toLowerCase()} className="text-lg font-bold text-foreground mt-7 mb-3 tracking-tight">
          {renderInline(h1[1], `h1-${k}`, highlights)}
        </h1>
      )
      i++; continue
    }

    if (/^(---+|\*\*\*+)$/.test(trimmed)) {
      nodes.push(<hr key={key++} className="border-separator my-5" />)
      i++; continue
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2))
        i++
      }
      const k = String(key++)
      nodes.push(
        <blockquote key={k} className="border-l-2 border-accent/50 bg-accent/[0.04] rounded-r-lg pl-4 pr-3 py-2.5 my-3 italic text-foreground/70">
          {quoteLines.map((ql, j) => (
            <p key={j} className="text-[13px] leading-7">{renderInline(ql, `bq-${k}-${j}`, highlights)}</p>
          ))}
        </blockquote>
      )
      continue
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      const isSep = (r: string) => /^[\s|:\-]+$/.test(r)
      const validRows = tableLines.filter((r, idx) => !(idx === 1 && isSep(r)))
      const splitRow = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())

      if (validRows.length >= 1) {
        const headers = splitRow(validRows[0])
        const rows = validRows.slice(1).map(splitRow)
        const k = String(key++)
        nodes.push(
          <div key={k} className="overflow-x-auto my-4 rounded-xl border border-separator">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-white/[0.05]">
                <tr>
                  {headers.map((h, ci) => (
                    <th key={ci} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-accent/80 border-b border-separator">
                      {renderInline(h, `th-${k}-${ci}`, highlights)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={cn('border-t border-separator/40 transition-colors', ri % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.025]', 'hover:bg-white/[0.04]')}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-[13px] text-foreground/80" style={riskCellStyle(cell)}>
                        {renderInline(cell, `td-${k}-${ri}-${ci}`, highlights)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && (/^[-*•]\s+/.test(lines[i].trim()) || /^\s{2,}[-*•]\s+/.test(lines[i]))) {
        const t = lines[i].trim().replace(/^[-*•]\s+/, '')
        if (t) items.push(t)
        i++
      }
      const k = String(key++)
      nodes.push(
        <ul key={k} className="my-3 space-y-1.5 pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0" />
              <span className="text-[13px] text-foreground/85 leading-7">{renderInline(item, `ul-${k}-${j}`, highlights)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const t = lines[i].trim().replace(/^\d+\.\s+/, '')
        if (t) items.push(t)
        i++
      }
      const k = String(key++)
      nodes.push(
        <ol key={k} className="my-3 space-y-1.5 pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {j + 1}
              </span>
              <span className="text-[13px] text-foreground/85 leading-7">{renderInline(item, `ol-${k}-${j}`, highlights)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

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
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      const t = paraLines.join(' ')
      const k = String(key++)
      nodes.push(
        <p key={k} className="text-[13px] text-foreground/85 leading-7 mb-3">
          {renderInline(t, `p-${k}`, highlights)}
        </p>
      )
    }
  }

  return nodes
}

interface DocumentViewerProps {
  content: string
  highlights: Highlight[]
  onAddHighlight: (h: Highlight) => void
  onClearHighlights: () => void
  className?: string
}

export const DocumentViewer = forwardRef<DocumentViewerRef, DocumentViewerProps>(
  ({ content, highlights, onAddHighlight, onClearHighlights, className }, ref) => {
    const [highlightMode, setHighlightMode] = useState(false)
    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0])
    const contentRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      scrollToText: (searchText: string) => {
        if (!contentRef.current) return
        const lower = searchText.toLowerCase().slice(0, 40)

        const headings = contentRef.current.querySelectorAll('[data-section]')
        for (const el of headings) {
          const sec = el.getAttribute('data-section') || ''
          if (sec.includes(lower) || lower.includes(sec.slice(0, 20))) {
            scrollAndFlash(el as HTMLElement)
            return
          }
        }

        const allEls = contentRef.current.querySelectorAll('p, li, h1, h2, h3, td, blockquote')
        for (const el of allEls) {
          if ((el.textContent || '').toLowerCase().includes(lower)) {
            scrollAndFlash(el as HTMLElement)
            return
          }
        }
      },
    }))

    function scrollAndFlash(el: HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      const prev = el.style.cssText
      el.style.cssText += ';background:rgba(0,122,255,0.18);border-radius:6px;transition:background 0.25s ease;'
      setTimeout(() => {
        el.style.background = ''
        setTimeout(() => { el.style.cssText = prev }, 300)
      }, 1600)
    }

    const handleMouseUp = useCallback(() => {
      if (!highlightMode) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const inContent = contentRef.current?.contains(sel.anchorNode) || contentRef.current?.contains(sel.focusNode)
      if (!inContent) return

      // Normalize: collapse all whitespace so cross-element selections match correctly
      const normalized = sel.toString().replace(/\s+/g, ' ').trim()
      if (!normalized || normalized.length < 2) return

      onAddHighlight({
        id: Math.random().toString(36).slice(2),
        text: normalized,
        color: selectedColor.bg,
      })
      sel.removeAllRanges()
    }, [highlightMode, selectedColor, onAddHighlight])

    const nodes = parseMarkdown(content, highlights)

    return (
      <div className={cn('flex flex-col gap-3', className)} onMouseUp={handleMouseUp}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setHighlightMode(v => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] h-6 px-2.5 rounded-md transition-all border font-medium',
              highlightMode
                ? 'bg-accent/15 text-accent border-accent/40'
                : 'bg-white/[0.04] text-muted border-separator hover:text-foreground hover:border-card-border-hover'
            )}
          >
            <Highlighter className="w-3 h-3" />
            {highlightMode ? 'Highlighting On' : 'Highlight'}
          </button>

          {highlightMode && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-separator">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.label}
                  onClick={() => setSelectedColor(color)}
                  title={color.label}
                  className={cn(
                    'w-3.5 h-3.5 rounded-full transition-all border-2',
                    selectedColor.label === color.label
                      ? 'scale-125 border-white/70'
                      : 'border-transparent hover:scale-110'
                  )}
                  style={{ background: color.dot }}
                />
              ))}
            </div>
          )}

          {highlights.length > 0 && (
            <button
              onClick={onClearHighlights}
              className="inline-flex items-center gap-1 text-[11px] h-6 px-2 rounded-md text-muted hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear ({highlights.length})
            </button>
          )}

          {highlightMode && (
            <span className="text-[11px] text-muted italic">Select text to highlight</span>
          )}
        </div>

        <div
          ref={contentRef}
          className={cn('min-w-0', highlightMode && 'cursor-text select-text')}
        >
          {nodes}
        </div>
      </div>
    )
  }
)

DocumentViewer.displayName = 'DocumentViewer'

// Lightweight markdown renderer — same styles as DocumentViewer but no toolbar.
// Use inside chat bubbles or anywhere you just need rendered markdown.
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const nodes = parseMarkdown(content, [])
  return <div className={cn('min-w-0', className)}>{nodes}</div>
}
