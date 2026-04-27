'use client'

import { useState } from 'react'
import { FileSearch } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function DocumentAnalyzerPage() {
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

  return (
    <ToolLayout
      icon={FileSearch}
      name="Document Analyzer"
      description="Upload a legal document and get a lawyer-oriented first-pass review: facts, obligations, risks, missing protections, and negotiation points."
      category="Analyze"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1">
            <p className="panel-label">Upload Document</p>
            <FileUpload onFile={handleFile} onClear={handleClear} />
            {text && (
              <p className="text-xs text-muted px-1">
                {text.length.toLocaleString()} characters extracted
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {['Risk register', 'Key obligations', 'Missing protections', 'Negotiation points'].map((item) => (
                <div key={item} className="panel-subtle px-3 py-2 text-xs text-muted">
                  {item}
                </div>
              ))}
            </div>
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
        />
      }
    />
  )
}
