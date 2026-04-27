'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function RiskScorerPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (_file: File, nextText: string) => {
    setText(nextText)
    setResult(null)
    setScore(null)
  }

  const handleClear = () => {
    setText('')
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

  return (
    <ToolLayout
      icon={AlertTriangle}
      name="Risk Scorer"
      description="Score your contract risk from 0 (safe) to 100 (high risk). Identifies dangerous clauses with plain-English explanations."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1">
            <p className="panel-label">Upload Contract</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />
            <AnimatePresence>
              {score !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="panel-subtle p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Risk Score</span>
                    <span className={`text-2xl font-bold ${scoreColor}`}>
                      {score}<span className="text-base text-muted font-sans">/100</span>
                    </span>
                  </div>
                  <Progress value={score} />
                  <p className={`text-xs font-medium ${scoreColor}`}>{scoreLabel}</p>
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
        />
      }
    />
  )
}
