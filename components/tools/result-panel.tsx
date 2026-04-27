'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, CheckCheck, Loader2, Scale, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ResultPanelProps {
  result: string | null
  loading: boolean
  placeholder?: string
  className?: string
}

export function ResultPanel({ result, loading, placeholder, className }: ResultPanelProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'legaldoc-output.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        'rounded-[18px] macos-card flex flex-col overflow-hidden min-h-[560px]',
        className
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-separator flex-shrink-0 bg-surface/70">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" style={{ animation: loading ? 'pulse 1s ease-in-out infinite' : 'none' }} />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Review Output</span>
        </div>
        {result && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={download} className="gap-1.5 text-xs h-7 px-2">
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5 text-xs h-7 px-2">
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-5 py-16 text-center"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-[14px] bg-white/[0.04] border border-card-border-hover flex items-center justify-center">
                  <Scale className="w-6 h-6 text-accent" />
                </div>
                <Loader2 className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Building legal review…</p>
                <p className="text-xs text-muted">Usually takes 5-20 seconds</p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {[75, 55, 85, 45].map((w, i) => (
                  <motion.div
                    key={i}
                    className="h-2 rounded-full bg-white/[0.055]"
                    style={{ width: `${w}%` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.4, delay: i * 0.18, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-7">
                {result}
              </pre>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center gap-3 text-center py-16"
            >
              <div className="w-14 h-14 rounded-[14px] bg-white/[0.035] border border-card-border flex items-center justify-center">
                <Scale className="w-6 h-6 text-muted" />
              </div>
              <div>
                <p className="text-sm text-muted">
                  {placeholder || 'Output will appear here'}
                </p>
                <p className="text-xs text-muted-dark mt-1">Submit your input to get started</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
