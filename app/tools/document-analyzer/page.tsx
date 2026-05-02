'use client'

import { useState, useRef, useEffect } from 'react'
import { FileSearch, ArrowRight, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { QuickInsights } from '@/components/tools/quick-insights'
import { SourceViewer, SourceViewerRef } from '@/components/tools/source-viewer'
import { Button } from '@/components/ui/button'
import { DocumentViewerRef } from '@/components/tools/document-viewer'
import { api } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument, registerUnloadClear } from '@/lib/document-store'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-error'
import { cn } from '@/lib/utils'

const FEATURE_CHIPS = [
  { label: 'Risk register',        section: 'Risk Register' },
  { label: 'Key obligations',      section: 'Key Terms' },
  { label: 'Missing protections',  section: 'Missing or Weak' },
  { label: 'Negotiation points',   section: 'Negotiation' },
]

function parseFollowUpQuestions(result: string): string[] {
  const questions: string[] = []
  let inSection = false

  for (const line of result.split('\n')) {
    const trimmed = line.trim()
    if (/follow.?up questions?/i.test(trimmed) && /^#{1,3}/.test(trimmed)) {
      inSection = true
      continue
    }
    if (inSection) {
      if (/^#{1,3}/.test(trimmed) && !/follow.?up/i.test(trimmed)) break
      const bullet = trimmed.match(/^[-*•\d.]+\s+(.+\?)/)
      if (bullet) questions.push(bullet[1].trim())
    }
  }

  return questions.slice(0, 5)
}

export default function DocumentAnalyzerPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)
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
    saveDocument({ text: nextText, fileName: f.name })
  }

  const handleClear = () => {
    setFile(null)
    setText('')
    setFileName('')
    setResult(null)
    clearDocument()
  }

  const analyze = async () => {
    if (!text.trim()) return toast.error('Please upload a document first')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.analyzeDocument(text)
      setResult(data.result)
    } catch (e: any) {
      handleApiError(e)
    } finally {
      setLoading(false)
    }
  }

  const handleChipClick = (section: string, label: string) => {
    if (!result) return
    setActiveChip(label)
    viewerRef.current?.scrollToText(section)
    setTimeout(() => setActiveChip(null), 1500)
  }

  const handleFollowUpClick = (question: string) => {
    router.push(`/tools/legal-qa?q=${encodeURIComponent(question)}`)
  }

  const followUpQuestions = result ? parseFollowUpQuestions(result) : []

  return (
    <ToolLayout
      icon={FileSearch}
      name="Document Analyzer"
      description="Upload a legal document and get a lawyer-oriented first-pass review: facts, obligations, risks, missing protections, and negotiation points."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-3 h-full">
          <div className="panel p-5 flex flex-col gap-3 flex-1 overflow-y-auto">
            <p className="panel-label">Upload Document</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />

            {text && <SourceViewer ref={sourceRef} file={file} text={text} fileName={fileName} />}

            {text && (
              <p className="text-[11px] text-muted px-1">
                {text.length.toLocaleString()} characters extracted
              </p>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {FEATURE_CHIPS.map(({ label, section }) => {
                const enabled = !!result
                const active = activeChip === label
                return (
                  <button
                    key={label}
                    onClick={() => handleChipClick(section, label)}
                    disabled={!enabled}
                    className={cn(
                      'panel-subtle px-3 py-2 text-[11px] text-left transition-all rounded-xl border',
                      enabled
                        ? 'hover:bg-accent/[0.08] hover:border-accent/30 hover:text-foreground cursor-pointer text-muted'
                        : 'text-muted-dark cursor-not-allowed opacity-50',
                      active && 'bg-accent/[0.12] border-accent/40 text-accent'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <QuickInsights
              result={result}
              loading={loading && !!text}
              onScrollTo={t => sourceRef.current?.openAndScrollTo(t)}
            />

            {followUpQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Ask in Q&A</span>
                </div>
                <div className="space-y-1.5">
                  {followUpQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUpClick(q)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-separator bg-white/[0.02] hover:bg-accent/[0.07] hover:border-accent/30 transition-all text-left group"
                    >
                      <span className="text-[11px] text-foreground/70 group-hover:text-foreground/90 leading-4 flex-1">{q}</span>
                      <ArrowRight className="w-3 h-3 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={analyze} disabled={!text || loading} size="lg" className="w-full">
            {loading ? 'Analyzing…' : 'Analyze Document'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Upload a document and click Analyze to get a full AI breakdown."
          onClear={() => setResult(null)}
          viewerRef={viewerRef}
        />
      }
    />
  )
}
