'use client'

import { useState } from 'react'
import { FileSignature } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-error'

export default function NDAGeneratorPage() {
  const [form, setForm] = useState({
    party_a: '',
    party_b: '',
    type: '' as 'mutual' | 'one-way' | '',
    jurisdiction: '',
    duration: '',
    purpose: '',
  })
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setResult(null)
  }

  const generate = async () => {
    const { party_a, party_b, type, jurisdiction, duration, purpose } = form
    if (!party_a || !party_b || !type || !jurisdiction || !duration || !purpose) {
      return toast.error('Please fill in all fields')
    }
    setLoading(true)
    setResult(null)
    try {
      const data = await api.generateNDA({
        party_a,
        party_b,
        type: type as 'mutual' | 'one-way',
        jurisdiction,
        duration,
        purpose,
      })
      setResult(data.result)
    } catch (e: any) {
      handleApiError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={FileSignature}
      name="NDA Generator"
      description="Generate a research-informed Non-Disclosure Agreement tailored to Indian law — mutual or one-way, with your parties and jurisdiction. Review by a qualified lawyer is recommended."
      category="Draft"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>NDA Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select NDA type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mutual">Mutual (both parties share information)</SelectItem>
                  <SelectItem value="one-way">One-Way (one party discloses)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disclosing Party / Party A</Label>
              <Input
                value={form.party_a}
                onChange={(e) => set('party_a', e.target.value)}
                placeholder="e.g. Tata Consultancy Services Limited, Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label>Receiving Party / Party B</Label>
              <Input
                value={form.party_b}
                onChange={(e) => set('party_b', e.target.value)}
                placeholder="e.g. Infosys Limited, Bengaluru"
              />
            </div>
            <div className="space-y-2">
              <Label>Governing Jurisdiction</Label>
              <Input
                value={form.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra · Bengaluru, Karnataka · New Delhi"
              />
            </div>
            <div className="space-y-2">
              <Label>Confidentiality Duration</Label>
              <Input
                value={form.duration}
                onChange={(e) => set('duration', e.target.value)}
                placeholder="e.g. 3 years from signing · 5 years · indefinite"
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose / Context</Label>
              <Textarea
                value={form.purpose}
                onChange={(e) => set('purpose', e.target.value)}
                placeholder="e.g. Evaluating a potential joint venture to develop a FinTech platform for the Indian market"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={!form.party_a || !form.party_b || !form.type || !form.jurisdiction || !form.duration || !form.purpose || loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Generating…' : 'Generate NDA'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Fill in the NDA details and click Generate to get a complete, ready-to-use NDA."
        />
      }
    />
  )
}
