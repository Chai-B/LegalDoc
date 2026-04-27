'use client'

import { motion } from 'framer-motion'
import { ExternalLink, BookOpen, Scale, FileText, ScrollText } from 'lucide-react'
import type { Citation } from '@/lib/api'

const sourceIcon: Record<string, typeof BookOpen> = {
  statute: Scale,
  rule: ScrollText,
  judgment: BookOpen,
  circular: FileText,
}

interface CitationListProps {
  citations: Citation[]
  className?: string
}

export function CitationList({ citations, className = '' }: CitationListProps) {
  if (!citations.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={className}
    >
      <p className="panel-label mb-2.5">Sources Cited</p>
      <div className="space-y-2">
        {citations.map((cite, i) => {
          const Icon = sourceIcon[cite.source_type] || FileText
          return (
            <div
              key={`${cite.title}-${cite.section_ref}-${i}`}
              className="panel-subtle p-3 flex items-start gap-3 group"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-card-border-hover bg-white/[0.04]">
                <Icon className="h-3.5 w-3.5 text-accent" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {cite.title}
                  {cite.section_ref && (
                    <span className="text-muted font-normal"> — {cite.section_ref}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted mt-0.5 truncate">
                  {[cite.authority, cite.citation_ref].filter(Boolean).join(' · ')}
                </p>
              </div>
              {cite.source_url && (
                <a
                  href={cite.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-accent transition-colors mt-0.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
