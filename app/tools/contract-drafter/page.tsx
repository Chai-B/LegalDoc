'use client'

import { useState } from 'react'
import { FilePen } from 'lucide-react'
import { ToolLayout } from '@/components/tools/tool-layout'
import { ResultPanel } from '@/components/tools/result-panel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'sonner'

const CONTRACT_TYPES = [
  { value: 'Service Agreement', label: 'Service Agreement' },
  { value: 'Freelance Contract', label: 'Freelance Contract' },
  { value: 'Employment Contract', label: 'Employment Contract' },
  { value: 'SaaS Subscription Agreement', label: 'SaaS Subscription Agreement' },
  { value: 'Consulting Agreement', label: 'Consulting Agreement' },
  { value: 'Partnership Agreement', label: 'Partnership Agreement' },
  { value: 'Sales Agreement', label: 'Sales Agreement' },
  { value: 'License Agreement', label: 'License Agreement' },
]

export default function ContractDrafterPage() {
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const draft = async () => {
    if (!description.trim()) return toast.error('Please describe your agreement')
    if (!type) return toast.error('Please select a contract type')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.draftContract(description, type)
      setResult(data.result)
    } catch (e: any) {
      toast.error(e.message || 'Drafting failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolLayout
      icon={FilePen}
      name="Contract Drafter"
      description="Describe your deal in plain English and get a complete, professionally worded contract ready to use."
      category="Draft"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-5 flex-1">
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value)
                  setResult(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type…" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Describe Your Agreement</Label>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setResult(null)
                }}
                placeholder="e.g. I'm hiring a freelance designer to create a brand identity for my startup. They'll deliver logos, color palette, and typography guidelines within 4 weeks for $2,500. I want to own all the work."
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted">
                Be specific about parties, deliverables, payment, timeline, and any special terms.
              </p>
            </div>
          </div>
          <Button
            onClick={draft}
            disabled={!description.trim() || !type || loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Drafting…' : 'Generate Contract'}
          </Button>
        </div>
      }
      outputPanel={
        <ResultPanel
          result={result}
          loading={loading}
          placeholder="Describe your agreement and select a type to generate a complete contract draft."
        />
      }
    />
  )
}
