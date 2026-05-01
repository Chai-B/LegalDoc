'use client'

import { useState, useRef, useEffect } from 'react'
import { FileSearch } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { QuickInsights } from '@/components/tools/quick-insights'
import { SourceViewer } from '@/components/tools/source-viewer'
import { Button } from '@/components/ui/button'
import { DocumentViewerRef } from '@/components/tools/document-viewer'
import { api } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument } from '@/lib/document-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Maps feature chip label → section heading to scroll to in the output
const FEATURE_CHIPS = [
  { label: 'Risk register',        section: 'Risk Register' },
  { label: 'Key obligations',      section: 'Key Terms' },
  { label: 'Missing protections',  section: 'Missing or Weak' },
  { label: 'Negotiation points',   section: 'Negotiation' },
]

export default function DocumentAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const viewerRef = useRef<DocumentViewerRef>(null)

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
      toast.error(e.message || 'Analysis failed')
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

  return (
    <ToolLayout
      icon={FileSearch}
      name="Document Analyzer"
      description="Upload a legal document and get a lawyer-oriented first-pass review: facts, obligations, risks, missing protections, and negotiation points."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-3 h-full">
          <div className="panel p-5 flex flex-col gap-3 flex-1">
            <p className="panel-label">Upload Document</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />

            {text && <SourceViewer file={file} text={text} fileName={fileName} />}

            {text && (
              <p className="text-[11px] text-muted px-1">
                {text.length.toLocaleString()} characters extracted
              </p>
            )}

            {/* Feature chips — now functional: click to jump to section */}
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
              onScrollTo={t => viewerRef.current?.scrollToText(t)}
            />
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
