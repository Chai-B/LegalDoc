'use client'

import { useState } from 'react'
import { SplitSquareHorizontal } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function ClauseExtractorPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (_file: File, nextText: string) => {
    setText(nextText)
    setResult(null)
  }

  const handleClear = () => {
    setText('')
    setResult(null)
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
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1">
            <p className="panel-label">Upload Document</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />
            {text && (
              <p className="text-xs text-muted px-1">
                {text.length.toLocaleString()} characters ready
              </p>
            )}
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
        />
      }
    />
  )
}
