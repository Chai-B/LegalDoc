'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { SourceViewer } from '@/components/tools/source-viewer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DocumentViewerRef } from '@/components/tools/document-viewer'
import { api } from '@/lib/api'
import type { Citation, ConfidenceLevel } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument } from '@/lib/document-store'
import { toast } from 'sonner'

const SAMPLE_QUESTIONS = [
  'What are the termination conditions?',
  'Who owns the intellectual property?',
  'What are the payment terms?',
  'Is there a non-compete clause?',
  'What does Indian contract law say about consideration?',
]

export default function LegalQAPage() {
  const [file, setFile] = useState<File | null>(null)
  const [documentText, setDocumentText] = useState('')
  const [fileName, setFileName] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [citations, setCitations] = useState<Citation[]>([])
  const [confidence, setConfidence] = useState<ConfidenceLevel | undefined>()
  const [loading, setLoading] = useState(false)
  const viewerRef = useRef<DocumentViewerRef>(null)

  useEffect(() => {
    const saved = loadDocument()
    if (saved && !documentText) {
      setDocumentText(saved.text)
      setFileName(saved.fileName)
    }
  }, [])

  const handleFile = (f: File, nextText: string) => {
    setFile(f)
    setDocumentText(nextText)
    setFileName(f.name)
    setResult(null)
    setCitations([])
    setConfidence(undefined)
    saveDocument({ text: nextText, fileName: f.name })
  }

  const handleClear = () => {
    setFile(null)
    setDocumentText('')
    setFileName('')
    setResult(null)
    setCitations([])
    setConfidence(undefined)
    clearDocument()
  }

  const ask = async () => {
    if (!question.trim()) return toast.error('Please enter a question')
    setLoading(true)
    setResult(null)
    setCitations([])
    setConfidence(undefined)
    try {
      const data = await api.researchQuery(question, documentText || undefined)
      setResult(data.answer)
      setCitations(data.citations)
      setConfidence(data.confidence)
    } catch {
      if (documentText) {
        try {
          const data = await api.legalQA(question, documentText)
          setResult(data.result)
        } catch (e: any) {
          toast.error(e.message || 'Q&A failed')
        }
      } else {
        toast.error('Please upload a document or try again')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={MessageSquare}
      name="Legal Q&A"
      description="Ask legal questions about Indian law or your uploaded document. Answers are grounded in retrieved legal authorities and document excerpts."
      category="Understand"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1">
            <div>
              <p className="panel-label mb-3">1. Upload Document (Optional)</p>
              <FileUpload onFile={handleFile} onClear={handleClear} />
              {documentText && (
                <>
                  <p className="text-[11px] text-muted mt-2 px-1">
                    {documentText.length.toLocaleString()} characters loaded
                  </p>
                  <div className="mt-2">
                    <SourceViewer file={file} text={documentText} fileName={fileName} />
                  </div>
                </>
              )}
              {!documentText && (
                <p className="text-[11px] text-muted-dark mt-2 px-1">
                  No document? You can still ask Indian-law questions using the public corpus.
                </p>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <Label>2. Ask Your Question</Label>
              <Textarea
                value={question}
                onChange={e => { setQuestion(e.target.value); setResult(null) }}
                placeholder="What do you want to know about Indian law or this document?"
                className="min-h-[100px] resize-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SAMPLE_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuestion(q); setResult(null) }}
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
            disabled={!question.trim() || loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Searching…' : 'Ask Question'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Ask a question about Indian law or upload a document to get answers grounded in legal authorities."
          citations={citations}
          confidence={confidence}
          onClear={() => { setResult(null); setCitations([]); setConfidence(undefined) }}
          viewerRef={viewerRef}
        />
      }
    />
  )
}
