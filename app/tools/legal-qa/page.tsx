'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const SAMPLE_QUESTIONS = [
  'What are the termination conditions?',
  'Who owns the intellectual property?',
  'What are the payment terms?',
  'Is there a non-compete clause?',
]

export default function LegalQAPage() {
  const [documentText, setDocumentText] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (_file: File, nextText: string) => {
    setDocumentText(nextText)
    setResult(null)
  }

  const handleClear = () => {
    setDocumentText('')
    setResult(null)
  }

  const ask = async () => {
    if (!documentText.trim()) return toast.error('Please upload a document first')
    if (!question.trim()) return toast.error('Please enter a question')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.legalQA(question, documentText)
      setResult(data.result)
    } catch (e: any) {
      toast.error(e.message || 'Q&A failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={MessageSquare}
      name="Legal Q&A"
      description="Upload a legal document and ask targeted questions. Answers are grounded in retrieved excerpts from the actual text."
      category="Understand"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-5 flex-1">
            <div>
              <p className="panel-label mb-3">
                1. Upload Document
              </p>
              <FileUpload onFile={handleFile} onClear={handleClear} />
              {documentText && (
                <p className="text-xs text-muted mt-2 px-1">
                  {documentText.length.toLocaleString()} characters loaded
                </p>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <Label>2. Ask Your Question</Label>
              <Textarea
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value)
                  setResult(null)
                }}
                placeholder="What do you want to know about this document?"
                className="min-h-[100px] resize-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuestion(q)
                      setResult(null)
                    }}
                    className="tool-chip text-muted hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            onClick={ask}
            disabled={!documentText || !question.trim() || loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Searching document…' : 'Ask Question'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Upload a document and ask a question to get answers grounded in the actual text."
        />
      }
    />
  )
}
