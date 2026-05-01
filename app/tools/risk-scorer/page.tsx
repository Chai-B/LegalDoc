'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { QuickInsights } from '@/components/tools/quick-insights'
import { SourceViewer } from '@/components/tools/source-viewer'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DocumentViewerRef } from '@/components/tools/document-viewer'
import { api } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument } from '@/lib/document-store'
import { toast } from 'sonner'

export default function RiskScorerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const viewerRef = useRef<DocumentViewerRef>(null)

  // Restore document from previous session
  useEffect(() => {
    const saved = loadDocument()
    if (saved && !text) {
      setText(saved.text)
      setFileName(saved.fileName)
    }
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

  const handleClearOutput = () => {
    setResult(null)
    setScore(null)
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
      toast.error(e.message || 'Scoring failed')
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

  return (
    <ToolLayout
      icon={AlertTriangle}
      name="Risk Scorer"
      description="Score your contract risk from 0 (safe) to 100 (high risk). Identifies dangerous clauses with plain-English explanations."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-3 h-full">
          <div className="panel p-5 flex flex-col gap-3 flex-1">
            <p className="panel-label">Upload Contract</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />

            {text && <SourceViewer file={file} text={text} fileName={fileName} />}

            {/* Risk score badge */}
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

            {/* Quick insights — clickable, scroll to output section */}
            <QuickInsights
              result={result}
              loading={loading && !!text}
              onScrollTo={text => viewerRef.current?.scrollToText(text)}
            />
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
          onClear={handleClearOutput}
          viewerRef={viewerRef}
        />
      }
    />
  )
}
