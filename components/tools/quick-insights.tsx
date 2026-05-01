'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Zap, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Level = 'high' | 'medium' | 'low' | 'info'

interface Insight {
  text: string
  level: Level
  sectionHint: string  // used for scroll targeting
}

function parseInsights(result: string): Insight[] {
  const insights: Insight[] = []
  const lines = result.split('\n')

  let currentSection = 'info'
  let currentSectionText = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const lower = trimmed.toLowerCase()

    // Track section headings
    if (/^#{1,3}\s/.test(trimmed)) {
      const sectionTitle = trimmed.replace(/^#+\s*/, '')
      currentSectionText = sectionTitle

      if (lower.includes('high') || lower.includes('critical') || lower.includes('danger')) {
        currentSection = 'high'
      } else if (lower.includes('medium') || lower.includes('moderate') || lower.includes('missing') || lower.includes('weak') || lower.includes('concern')) {
        currentSection = 'medium'
      } else if (lower.includes('low') || lower.includes('recommend') || lower.includes('suggest') || lower.includes('negotiat')) {
        currentSection = 'info'
      } else {
        currentSection = 'info'
      }
      continue
    }

    // Numbered section titles (e.g., "1. Overall Risk Assessment")
    if (/^\d+\.\s+[A-Z]/.test(trimmed) && trimmed.length < 60) {
      currentSectionText = trimmed.replace(/^\d+\.\s+/, '')
      continue
    }

    // Only extract bullet/list lines
    const isBullet = /^[-*•]\s+/.test(trimmed)
    if (!isBullet) continue

    let text = trimmed
      .replace(/^[-*•]\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim()

    if (text.length < 12 || text.length > 120) continue

    let level: Level = currentSection as Level
    if (/\b(high risk|critical|dangerous|severe|urgent)\b/i.test(text)) level = 'high'
    else if (/\b(medium risk|moderate|concern|caution|weak|missing|absent|lack)\b/i.test(text)) level = 'medium'
    else if (/\b(low risk|safe|adequate|standard|compliant|good)\b/i.test(text)) level = 'low'

    if (text.length > 90) text = text.slice(0, 87) + '…'

    insights.push({ text, level, sectionHint: currentSectionText || text.slice(0, 30) })
    if (insights.length >= 7) break
  }

  return insights
}

const LEVEL_CONFIG = {
  high: {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    bg: 'bg-red-500/[0.07] border-red-500/20 hover:bg-red-500/[0.11]',
    textColor: 'text-red-200/80',
  },
  medium: {
    icon: AlertCircle,
    iconColor: 'text-iris',
    bg: 'bg-iris/[0.07] border-iris/20 hover:bg-iris/[0.11]',
    textColor: 'text-foreground/80',
  },
  low: {
    icon: CheckCircle2,
    iconColor: 'text-teal',
    bg: 'bg-teal/[0.07] border-teal/20 hover:bg-teal/[0.1]',
    textColor: 'text-foreground/80',
  },
  info: {
    icon: Info,
    iconColor: 'text-accent',
    bg: 'bg-accent/[0.06] border-accent/15 hover:bg-accent/[0.1]',
    textColor: 'text-foreground/80',
  },
}

interface QuickInsightsProps {
  result: string | null
  loading?: boolean
  onScrollTo?: (text: string) => void
  className?: string
}

export function QuickInsights({ result, loading, onScrollTo, className }: QuickInsightsProps) {
  const insights = result ? parseInsights(result) : []

  return (
    <AnimatePresence>
      {(loading || insights.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className={cn('space-y-2', className)}
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Quick Insights</span>
            {onScrollTo && insights.length > 0 && (
              <span className="text-[10px] text-muted-dark italic ml-auto">Click to jump</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-1.5">
              {[80, 65, 72].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-8 rounded-xl bg-white/[0.04] border border-separator"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {insights.map((insight, idx) => {
                const cfg = LEVEL_CONFIG[insight.level]
                const Icon = cfg.icon
                const clickable = !!onScrollTo

                return (
                  <motion.button
                    key={idx}
                    type="button"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onScrollTo?.(insight.sectionHint || insight.text)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 rounded-xl border text-left transition-all',
                      cfg.bg,
                      clickable ? 'cursor-pointer group' : 'cursor-default'
                    )}
                  >
                    <Icon className={cn('w-3 h-3 flex-shrink-0 mt-0.5', cfg.iconColor)} />
                    <span className={cn('text-[11px] leading-[1.5] flex-1', cfg.textColor)}>{insight.text}</span>
                    {clickable && (
                      <ArrowRight className="w-2.5 h-2.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
