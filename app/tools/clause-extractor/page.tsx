'use client'

import { useState, useRef, useEffect } from 'react'
import { SplitSquareHorizontal } from 'lucide-react'
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

export default function ClauseExtractorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

  const extract = async () => {
    if (!text.trim()) return toast.error('Please upload a document first')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.extractClauses(text)
      setResult(data.result)
    } catch (e: any) {
      toast.error(e.message || 'Extraction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={SplitSquareHorizontal}
      name="Clause Extractor"
      description="Extract and categorize every clause in your document — termination, indemnity, payment, IP, non-compete, jurisdiction, and more."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-3 h-full">
          <div className="panel p-5 flex flex-col gap-3 flex-1">
            <p className="panel-label">Upload Document</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />

            {text && <SourceViewer file={file} text={text} fileName={fileName} />}

            {text && (
              <p className="text-[11px] text-muted px-1">
                {text.length.toLocaleString()} characters ready
              </p>
            )}

            <QuickInsights
              result={result}
              loading={loading && !!text}
              onScrollTo={t => viewerRef.current?.scrollToText(t)}
            />
          </div>

          <Button onClick={extract} disabled={!text || loading} size="lg" className="w-full">
            {loading ? 'Extracting…' : 'Extract Clauses'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Upload a document to extract and categorize all its legal clauses."
          onClear={() => setResult(null)}
          viewerRef={viewerRef}
        />
      }
    />
  )
}
