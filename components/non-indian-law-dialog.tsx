'use client'

import { useEffect, useState } from 'react'
import { Scale, X } from 'lucide-react'

export function NonIndianLawDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('nonIndianLawError', handler)
    return () => window.removeEventListener('nonIndianLawError', handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1a1a1a] shadow-2xl p-6 flex flex-col gap-4">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Indian Law Only</h2>
            <p className="text-xs text-muted mt-0.5">Content outside scope</p>
          </div>
        </div>

        <p className="text-[13px] text-foreground/80 leading-6">
          LegalDoc only works with <strong className="text-foreground">Indian legal documents and questions</strong>.
          The content you provided does not appear to be a legal document or a legal question governed by Indian law.
        </p>

        <p className="text-[12px] text-muted leading-5">
          Please upload an Indian legal document (contract, NDA, agreement, etc.) or ask a question about Indian law.
        </p>

        <button
          onClick={() => setOpen(false)}
          className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-medium hover:bg-red-500/20 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
