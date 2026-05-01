'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Highlighter, ChevronRight, FileType } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Sentence-level importance scoring ────────────────────────────────────────

function scoreSentence(sentence: string): number {
  let score = 0
  const s = sentence.toLowerCase()

  // Core obligation / risk words — high weight
  const HIGH = ['shall', 'must', 'liable', 'liability', 'liabilities', 'indemnif', 'terminate', 'termination', 'breach', 'default', 'penalty', 'penalties', 'damages', 'forfeit', 'void', 'null and void', 'injunction', 'consequential']
  for (const w of HIGH) { if (s.includes(w)) score += 3 }

  // Important legal markers
  const MED = ['will', 'agree', 'covenant', 'warrant', 'represent', 'acknowledge', 'undertake', 'obligation', 'responsible', 'entitled', 'right to', 'duty', 'authorize', 'permit', 'prohibit', 'restrict', 'exclusive']
  for (const w of MED) { if (s.includes(w)) score += 1.5 }

  // Restrictions / prohibitions
  if (/(may not|shall not|must not|not permitted|prohibited|forbidden|without prior)/i.test(sentence)) score += 3

  // Financial amounts — very important
  if (/[₹$£€][\d,]+|INR\s*[\d,]+|\d+\s*(?:lakhs?|crores?|thousands?|millions?|billions?)/i.test(sentence)) score += 5

  // Time-bound obligations
  if (/\d+\s*(?:business\s+)?(?:days?|months?|years?|weeks?)\s*(?:of|from|after|before|within|prior to)/i.test(sentence)) score += 2.5

  // Dates
  if (/\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})\b/i.test(sentence)) score += 2

  // Definitions (key for understanding the whole doc)
  if (/(means?|shall mean|refers? to|is defined|hereinafter called|herein called)/i.test(sentence)) score += 2.5

  // Confidentiality / IP / non-compete
  if (/(confidential|proprietary|trade secret|intellectual property|non-compete|non-disclosure|copyright|trademark|patent)/i.test(sentence)) score += 2

  return score
}

// ── HTML-escaped plain text with sentence highlights ─────────────────────────

function buildHighlightedHTML(text: string, showHighlights: boolean): string {
  if (!showHighlights) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
  }

  // Split into rough sentences (keep delimiters)
  const sentenceRe = /([^.!?]*[.!?]+)/g
  const escapeHTML = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // First apply keyword-level highlights to the full text, then sentence-level backgrounds
  let processed = text.replace(/\n/g, '\n')

  // Split into paragraphs first
  const paras = processed.split(/\n{2,}/)

  const resultParas = paras.map(para => {
    // Split para into sentences
    const sentences: string[] = []
    let remaining = para
    let match: RegExpExecArray | null

    sentenceRe.lastIndex = 0
    while ((match = sentenceRe.exec(para)) !== null) {
      sentences.push(match[1])
    }
    // Any leftover text after last punctuation
    const lastSentEnd = sentences.reduce((acc, s) => acc + s.length, 0)
    if (lastSentEnd < para.length) {
      sentences.push(para.slice(lastSentEnd))
    }

    const renderedSentences = sentences.map(sentence => {
      const score = scoreSentence(sentence)
      const escaped = escapeHTML(sentence)

      let wrapped = escaped

      // Keyword highlights (applied on top of sentence background)
      // Risk / critical — red
      wrapped = wrapped.replace(/\b(indemnif\w*|terminat\w*|breach\w*|liabilit\w*|liable|penalt\w*|damages?|default\w*|void\b|null and void|forfeit\w*)\b/gi,
        '<mark style="background:rgba(239,68,68,0.25);color:rgb(252,165,165);border-radius:3px;padding:0 2px">$&</mark>')
      // Obligations — blue
      wrapped = wrapped.replace(/\b(shall|must|hereby|herein|hereunder|covenant\w*|warrant\w*|represent\w*|oblig\w*|undertake\w*)\b/gi,
        '<mark style="background:rgba(96,165,250,0.2);color:rgb(147,197,253);border-radius:3px;padding:0 2px">$&</mark>')
      // Financial amounts — green
      wrapped = wrapped.replace(/(₹|INR|Rs\.?|USD|\$|£|€)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:lakhs?|crores?|thousands?|millions?))?/gi,
        '<mark style="background:rgba(52,211,153,0.25);color:rgb(110,231,183);border-radius:3px;padding:0 2px">$&</mark>')
      // Dates — teal
      wrapped = wrapped.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\b/gi,
        '<mark style="background:rgba(73,214,200,0.15);color:rgb(94,234,212);border-radius:3px;padding:0 2px">$&</mark>')
      // Restrictions — orange
      wrapped = wrapped.replace(/\b(may not|shall not|must not|not permitted|prohibited|forbidden)\b/gi,
        '<mark style="background:rgba(251,146,60,0.2);color:rgb(253,186,116);border-radius:3px;padding:0 2px">$&</mark>')
      // Confidentiality / IP — purple
      wrapped = wrapped.replace(/\b(confidential\w*|proprietary|trade\s+secret\w*|intellectual\s+property|non-compete|non-disclosure|copyright|trademark|patent\w*)\b/gi,
        '<mark style="background:rgba(168,85,247,0.2);color:rgb(216,180,254);border-radius:3px;padding:0 2px">$&</mark>')

      // Sentence-level background based on importance score
      if (score >= 6) {
        return `<span style="background:rgba(255,200,50,0.1);border-left:2px solid rgba(255,200,50,0.5);padding:1px 4px 1px 6px;border-radius:0 3px 3px 0;display:inline" title="High importance">${wrapped}</span>`
      } else if (score >= 3) {
        return `<span style="background:rgba(96,165,250,0.07);border-left:2px solid rgba(96,165,250,0.35);padding:1px 4px 1px 6px;border-radius:0 3px 3px 0;display:inline" title="Medium importance">${wrapped}</span>`
      }
      return wrapped
    })

    return renderedSentences.join('')
  })

  return resultParas.join('<br/><br/>')
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SourceViewerProps {
  file?: File | null
  text: string
  fileName?: string
}

export function SourceViewer({ file, text, fileName }: SourceViewerProps) {
  const [open, setOpen] = useState(false)
  const [showHighlights, setShowHighlights] = useState(true)
  const [viewMode, setViewMode] = useState<'original' | 'text'>('original')

  const isPDF = file?.type === 'application/pdf'

  const pdfURL = useMemo(() => {
    if (!file || !isPDF) return null
    return URL.createObjectURL(file)
  }, [file, isPDF])

  const processedHTML = useMemo(
    () => buildHighlightedHTML(text, showHighlights),
    [text, showHighlights]
  )

  // Auto-select text view for non-PDF files
  const defaultView = isPDF ? 'original' : 'text'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-separator bg-white/[0.025] hover:bg-white/[0.04] hover:border-card-border-hover transition-all text-[11px] text-muted hover:text-foreground group"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-accent/70" />
          <span>View Source Document</span>
          {isPDF && <span className="text-[10px] text-muted-dark">· PDF</span>}
        </span>
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
            style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' }}
          >
            <div className="flex-1" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="w-full max-w-[680px] flex flex-col bg-[#0d0d0d] border-l border-separator shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-separator flex-shrink-0 bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-separator flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium truncate max-w-xs">{fileName || 'Source Document'}</p>
                    <p className="text-[10px] text-muted">{text.length.toLocaleString()} characters extracted</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* View mode toggle (for PDFs) */}
                  {isPDF && (
                    <div className="flex items-center rounded-lg border border-separator overflow-hidden">
                      {(['original', 'text'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            'text-[10px] px-2.5 py-1.5 font-medium transition-colors',
                            viewMode === mode
                              ? 'bg-accent/20 text-accent'
                              : 'text-muted hover:text-foreground hover:bg-white/[0.04]'
                          )}
                        >
                          {mode === 'original' ? 'PDF' : 'Text + AI'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Highlights toggle (text mode only) */}
                  {(!isPDF || viewMode === 'text') && (
                    <button
                      onClick={() => setShowHighlights(v => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] h-7 px-2.5 rounded-lg border font-medium transition-all',
                        showHighlights
                          ? 'bg-accent/15 text-accent border-accent/40'
                          : 'bg-white/[0.04] text-muted border-separator hover:text-foreground'
                      )}
                    >
                      <Highlighter className="w-3 h-3" />
                      {showHighlights ? 'AI Highlights' : 'Plain'}
                    </button>
                  )}

                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] border border-separator flex items-center justify-center text-muted hover:text-foreground hover:bg-white/[0.07] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Importance legend (text mode) */}
              {(!isPDF || viewMode === 'text') && showHighlights && (
                <div className="px-5 py-2 border-b border-separator bg-white/[0.01] flex items-center gap-3 flex-wrap flex-shrink-0">
                  <span className="text-[10px] text-muted font-medium uppercase tracking-wider flex-shrink-0">Focus areas:</span>
                  {[
                    { bg: 'rgba(255,200,50,0.3)', label: 'High importance' },
                    { bg: 'rgba(96,165,250,0.2)', label: 'Medium importance' },
                    { bg: 'rgba(239,68,68,0.25)', label: 'Risk terms' },
                    { bg: 'rgba(96,165,250,0.2)', label: 'Obligations' },
                    { bg: 'rgba(52,211,153,0.25)', label: 'Amounts' },
                    { bg: 'rgba(168,85,247,0.2)', label: 'Confidentiality/IP' },
                  ].map(({ bg, label }) => (
                    <span key={label} className="flex items-center gap-1 text-[10px] text-muted flex-shrink-0">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: bg }} />
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {isPDF && viewMode === 'original' && pdfURL ? (
                  <iframe
                    src={pdfURL}
                    className="w-full h-full border-0"
                    title="Source PDF document"
                  />
                ) : (
                  <div className="h-full overflow-y-auto px-6 py-5">
                    <div
                      className="text-[12px] leading-7 text-foreground/70 font-mono break-words"
                      dangerouslySetInnerHTML={{ __html: processedHTML }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
