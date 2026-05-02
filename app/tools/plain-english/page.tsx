'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-error'

const EXAMPLES = [
  'The indemnifying party shall defend, indemnify, and hold harmless the indemnified party from and against any and all claims, damages, losses, costs, and expenses (including reasonable advocates\' fees) arising out of or relating to any breach of this Agreement, including any violation of applicable Indian law.',
  'Notwithstanding any other provision of this Agreement, disputes arising out of or in connection with this Agreement shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with the seat of arbitration at Mumbai, Maharashtra.',
]

export default function PlainEnglishPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const translate = async () => {
    if (!text.trim()) return toast.error('Please paste some legal text first')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.plainEnglish(text)
      setResult(data.result)
    } catch (e: any) {
      handleApiError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={BookOpen}
      name="Plain English Translator"
      description="Paste any legal clause or paragraph and get a plain-language explanation anyone can understand — no law degree required."
      category="Understand"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1">
            <div className="space-y-2 flex-1">
              <Label>Legal Text</Label>
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setResult(null)
                }}
                placeholder="Paste any legal clause, paragraph, or section here…"
                className="min-h-[200px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted">Try an example:</p>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setText(ex)
                    setResult(null)
                  }}
                  className="panel-subtle block w-full px-3 py-2 text-left text-xs text-muted-dark transition-colors hover:text-muted"
                >
                  Example {i + 1}: {ex.slice(0, 60)}…
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={translate}
            disabled={!text.trim() || loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Translating…' : 'Translate to Plain English'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Paste legal text and click Translate to get a plain-English explanation."
        />
      }
    />
  )
}
