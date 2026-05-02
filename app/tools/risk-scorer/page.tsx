'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { SourceViewer, SourceViewerRef } from '@/components/tools/source-viewer'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DocumentViewerRef } from '@/components/tools/document-viewer'
import { api } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument, registerUnloadClear } from '@/lib/document-store'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-error'
import { cn } from '@/lib/utils'

interface BreakdownRow {
  factor: string
  contribution: string
  explanation: string
}

function parseBreakdown(result: string): BreakdownRow[] {
  const rows: BreakdownRow[] = []
  let inTable = false

  for (const line of result.split('\n')) {
    const trimmed = line.trim()
    if (/risk score breakdown/i.test(trimmed)) { inTable = true; continue }
    if (inTable && trimmed.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())
      if (cells.length >= 2 && !/^[-:\s]+$/.test(cells[0])) {
        rows.push({
          factor: cells[0] || '',
          contribution: cells[1] || '',
          explanation: cells[2] || '',
        })
      }
    } else if (inTable && trimmed.startsWith('#')) {
      break
    }
  }

  return rows.filter(r => r.factor && !/^factor$/i.test(r.factor))
}

export default function RiskScorerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const viewerRef = useRef<DocumentViewerRef>(null)
  const sourceRef = useRef<SourceViewerRef>(null)

  useEffect(() => {
    const saved = loadDocument()
    if (saved && !text) {
      setText(saved.text)
      setFileName(saved.fileName)
    }
    return registerUnloadClear()
  }, [])

  const handleFile = (f: File, nextText: string) => {
    setFile(f)
    setText(nextText)
    setFileName(f.name)
    setResult(null)
    setScore(null)
    saveDocument({ text: nextText, fileName: f.name })
  }

  const handleClear = () => {
    setFile(null)
    setText('')
    setFileName('')
    setResult(null)
    setScore(null)
    clearDocument()
  }

  const analyze = async () => {
    if (!text.trim()) return toast.error('Please upload a contract first')
    setLoading(true)
    setResult(null)
    setScore(null)
    try {
      const data = await api.scoreRisk(text)
      setResult(data.result)
      setScore(data.score)
    } catch (e: any) {
      handleApiError(e)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor =
    score === null ? '' : score >= 70 ? 'text-red-400' : score >= 40 ? 'text-iris' : 'text-teal'
  const scoreLabel =
    score === null ? '' : score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate Risk' : 'Low Risk'
  const scoreBg =
    score === null ? '' : score >= 70
      ? 'bg-red-500/[0.07] border-red-500/20'
      : score >= 40
        ? 'bg-iris/[0.07] border-iris/20'
        : 'bg-teal/[0.07] border-teal/20'

  const breakdown = result ? parseBreakdown(result) : []

  return (
    <ToolLayout
      icon={AlertTriangle}
      name="Risk Scorer"
      description="Score your contract risk from 0 (safe) to 100 (high risk). Identifies dangerous clauses with plain-English explanations."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-3 h-full">
          <div className="panel p-5 flex flex-col gap-3 flex-1 overflow-y-auto">
            <p className="panel-label">Upload Contract</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />

            {text && <SourceViewer ref={sourceRef} file={file} text={text} fileName={fileName} />}

            <AnimatePresence>
              {score !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 space-y-2.5 ${scoreBg}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Risk Score</span>
                    <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
                      {score}
                      <span className="text-sm text-muted font-normal">/100</span>
                    </span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                  <p className={`text-xs font-semibold ${scoreColor}`}>{scoreLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {breakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-separator overflow-hidden"
                >
                  <div className="px-3 py-2 bg-white/[0.03] border-b border-separator">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Risk Breakdown</span>
                  </div>
                  <div className="divide-y divide-separator/50">
                    {breakdown.map((row, i) => {
                      const pct = parseFloat(row.contribution)
                      const barColor = pct >= 20 ? 'bg-red-400/60' : pct >= 10 ? 'bg-iris/60' : 'bg-teal/60'
                      return (
                        <div key={i} className="px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-foreground/80 font-medium truncate">{row.factor}</span>
                            <span className={cn('text-[11px] font-bold tabular-nums flex-shrink-0',
                              pct >= 20 ? 'text-red-400' : pct >= 10 ? 'text-iris' : 'text-teal'
                            )}>
                              {row.contribution}
                            </span>
                          </div>
                          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', barColor)}
                              style={{ width: `${Math.min(pct * 2.5, 100)}%` }}
                            />
                          </div>
                          {row.explanation && (
                            <p className="text-[10px] text-muted leading-4">{row.explanation}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button onClick={analyze} disabled={!text || loading} size="lg" className="w-full">
            {loading ? 'Scoring…' : 'Score Risk'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Upload a contract to get a risk score and detailed clause-by-clause analysis."
          onClear={() => { setResult(null); setScore(null) }}
          viewerRef={viewerRef}
        />
      }
    />
  )
}
