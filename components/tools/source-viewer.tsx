'use client'

import { useState, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Highlighter, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function scoreSentence(sentence: string): number {
  let score = 0
  const s = sentence.toLowerCase()

  const HIGH = ['shall', 'must', 'liable', 'liability', 'liabilities', 'indemnif', 'terminate', 'termination', 'breach', 'default', 'penalty', 'penalties', 'damages', 'forfeit', 'void', 'null and void', 'injunction', 'consequential']
  for (const w of HIGH) { if (s.includes(w)) score += 3 }

  const MED = ['will', 'agree', 'covenant', 'warrant', 'represent', 'acknowledge', 'undertake', 'obligation', 'responsible', 'entitled', 'right to', 'duty', 'authorize', 'permit', 'prohibit', 'restrict', 'exclusive']
  for (const w of MED) { if (s.includes(w)) score += 1.5 }

  if (/(may not|shall not|must not|not permitted|prohibited|forbidden|without prior)/i.test(sentence)) score += 3
  if (/[₹$£€][\d,]+|INR\s*[\d,]+|\d+\s*(?:lakhs?|crores?|thousands?|millions?|billions?)/i.test(sentence)) score += 5
  if (/\d+\s*(?:business\s+)?(?:days?|months?|years?|weeks?)\s*(?:of|from|after|before|within|prior to)/i.test(sentence)) score += 2.5
  if (/\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})\b/i.test(sentence)) score += 2
  if (/(means?|shall mean|refers? to|is defined|hereinafter called|herein called)/i.test(sentence)) score += 2.5
  if (/(confidential|proprietary|trade secret|intellectual property|non-compete|non-disclosure|copyright|trademark|patent)/i.test(sentence)) score += 2

  return score
}

function buildHighlightedHTML(text: string, showHighlights: boolean): string {
  const escapeHTML = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (!showHighlights) {
    return escapeHTML(text).replace(/\n/g, '<br/>')
  }

  const paras = text.split(/\n{2,}/)

  const resultParas = paras.map(para => {
    const sentences: string[] = []
    const sentenceRe = /([^.!?]*[.!?]+\s*)/g
    let match: RegExpExecArray | null

    sentenceRe.lastIndex = 0
    while ((match = sentenceRe.exec(para)) !== null) {
      sentences.push(match[1])
    }
    const lastSentEnd = sentences.reduce((acc, s) => acc + s.length, 0)
    if (lastSentEnd < para.length) {
      sentences.push(para.slice(lastSentEnd))
    }
    if (sentences.length === 0) sentences.push(para)

    const renderedSentences = sentences.map(sentence => {
      if (!sentence.trim()) return escapeHTML(sentence)
      const score = scoreSentence(sentence)
      let wrapped = escapeHTML(sentence)

      wrapped = wrapped.replace(/\b(indemnif\w*|terminat\w*|breach\w*|liabilit\w*|liable|penalt\w*|damages?|default\w*|void\b|null and void|forfeit\w*)\b/gi,
        '<mark style="background:rgba(239,68,68,0.3);color:rgb(252,165,165);border-radius:3px;padding:0 2px">$&</mark>')
      wrapped = wrapped.replace(/\b(shall|must|hereby|herein|hereunder|covenant\w*|warrant\w*|represent\w*|oblig\w*|undertake\w*)\b/gi,
        '<mark style="background:rgba(96,165,250,0.25);color:rgb(147,197,253);border-radius:3px;padding:0 2px">$&</mark>')
      wrapped = wrapped.replace(/(₹|INR|Rs\.?|USD|\$|£|€)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:lakhs?|crores?|thousands?|millions?))?/gi,
        '<mark style="background:rgba(52,211,153,0.3);color:rgb(110,231,183);border-radius:3px;padding:0 2px">$&</mark>')
      wrapped = wrapped.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}\b/gi,
        '<mark style="background:rgba(73,214,200,0.2);color:rgb(94,234,212);border-radius:3px;padding:0 2px">$&</mark>')
      wrapped = wrapped.replace(/\b(may not|shall not|must not|not permitted|prohibited|forbidden)\b/gi,
        '<mark style="background:rgba(251,146,60,0.25);color:rgb(253,186,116);border-radius:3px;padding:0 2px">$&</mark>')
      wrapped = wrapped.replace(/\b(confidential\w*|proprietary|trade\s+secret\w*|intellectual\s+property|non-compete|non-disclosure|copyright|trademark|patent\w*)\b/gi,
        '<mark style="background:rgba(168,85,247,0.25);color:rgb(216,180,254);border-radius:3px;padding:0 2px">$&</mark>')

      if (score >= 6) {
        return `<span data-sentence="high" style="background:rgba(255,200,50,0.1);border-left:2px solid rgba(255,200,50,0.5);padding:1px 4px 1px 6px;border-radius:0 3px 3px 0;display:inline">${wrapped}</span>`
      } else if (score >= 3) {
        return `<span data-sentence="medium" style="background:rgba(96,165,250,0.07);border-left:2px solid rgba(96,165,250,0.35);padding:1px 4px 1px 6px;border-radius:0 3px 3px 0;display:inline">${wrapped}</span>`
      }
      return wrapped
    })

    return renderedSentences.join('')
  })

  return resultParas.join('<br/><br/>')
}

export interface SourceViewerRef {
  openAndScrollTo: (searchText: string) => void
}

interface SourceViewerProps {
  file?: File | null
  text: string
  fileName?: string
}

export const SourceViewer = forwardRef<SourceViewerRef, SourceViewerProps>(
  ({ file, text, fileName }, ref) => {
    const [open, setOpen] = useState(false)
    const [showHighlights, setShowHighlights] = useState(true)
    const [viewMode, setViewMode] = useState<'original' | 'text'>('original')
    const contentRef = useRef<HTMLDivElement>(null)

    const isPDF = file?.type === 'application/pdf'

    const pdfURL = useMemo(() => {
      if (!file || !isPDF) return null
      return URL.createObjectURL(file)
    }, [file, isPDF])

    const processedHTML = useMemo(
      () => buildHighlightedHTML(text, showHighlights),
      [text, showHighlights]
    )

    const scrollToInContent = useCallback((searchText: string) => {
      if (!contentRef.current) return
      const lower = searchText.toLowerCase().slice(0, 60)
      const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        if ((node.textContent || '').toLowerCase().includes(lower)) {
          const parent = node.parentElement
          if (parent) {
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const prev = parent.style.cssText
            parent.style.cssText += ';outline:2px solid rgba(255,200,50,0.7);border-radius:4px;transition:outline 0.3s;'
            setTimeout(() => { parent.style.cssText = prev }, 1800)
          }
          return
        }
      }
    }, [])

    useImperativeHandle(ref, () => ({
      openAndScrollTo: (searchText: string) => {
        setOpen(true)
        setViewMode('text')
        setTimeout(() => scrollToInContent(searchText), 350)
      },
    }))

    const displayName = fileName
      ? (fileName.length > 28 ? fileName.slice(0, 25) + '…' : fileName)
      : 'Source Document'

    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-separator bg-white/[0.025] hover:bg-white/[0.04] hover:border-card-border-hover transition-all text-[11px] text-muted hover:text-foreground group"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" />
            <span className="truncate">{displayName}</span>
            {isPDF && <span className="text-[10px] text-muted-dark flex-shrink-0">· PDF</span>}
          </span>
          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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

                {(!isPDF || viewMode === 'text') && showHighlights && (
                  <div className="px-5 py-2 border-b border-separator bg-white/[0.01] flex items-center gap-3 flex-wrap flex-shrink-0">
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider flex-shrink-0">Focus areas:</span>
                    {[
                      { bg: 'rgba(255,200,50,0.3)', label: 'High importance' },
                      { bg: 'rgba(239,68,68,0.3)', label: 'Risk terms' },
                      { bg: 'rgba(96,165,250,0.25)', label: 'Obligations' },
                      { bg: 'rgba(52,211,153,0.3)', label: 'Amounts' },
                      { bg: 'rgba(168,85,247,0.25)', label: 'Confidentiality/IP' },
                    ].map(({ bg, label }) => (
                      <span key={label} className="flex items-center gap-1 text-[10px] text-muted flex-shrink-0">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: bg }} />
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-hidden">
                  {isPDF && viewMode === 'original' && pdfURL ? (
                    <iframe
                      src={`${pdfURL}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0"
                      title="Source PDF document"
                    />
                  ) : (
                    <div className="h-full overflow-y-auto px-6 py-5">
                      <div
                        ref={contentRef}
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
)

SourceViewer.displayName = 'SourceViewer'
