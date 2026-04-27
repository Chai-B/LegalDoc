'use client'

import { cn } from '@/lib/utils'
import type { ConfidenceLevel } from '@/lib/api'

const config: Record<ConfidenceLevel, { label: string; color: string; bg: string; border: string }> = {
  high: {
    label: 'High Confidence',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  medium: {
    label: 'Medium Confidence',
    color: 'text-iris',
    bg: 'bg-iris-muted',
    border: 'border-iris/20',
  },
  low: {
    label: 'Low Confidence',
    color: 'text-muted',
    bg: 'bg-white/5',
    border: 'border-white/[0.08]',
  },
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  className?: string
}

export function ConfidenceBadge({ level, className = '' }: ConfidenceBadgeProps) {
  const c = config[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        c.bg, c.border, c.color,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-green-400': level === 'high',
        'bg-iris': level === 'medium',
        'bg-muted': level === 'low',
      })} />
      {c.label}
    </span>
  )
}
