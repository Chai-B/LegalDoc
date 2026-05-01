'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileSearch, AlertTriangle, SplitSquareHorizontal, BookOpen, MessageSquare, FilePen, FileSignature } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { name: 'Analyzer', href: '/tools/document-analyzer', icon: FileSearch },
  { name: 'Risk Scorer', href: '/tools/risk-scorer', icon: AlertTriangle },
  { name: 'Clauses', href: '/tools/clause-extractor', icon: SplitSquareHorizontal },
  { name: 'Plain English', href: '/tools/plain-english', icon: BookOpen },
  { name: 'Q&A', href: '/tools/legal-qa', icon: MessageSquare },
  { name: 'Drafter', href: '/tools/contract-drafter', icon: FilePen },
  { name: 'NDA', href: '/tools/nda-generator', icon: FileSignature },
]

export function ToolTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b border-separator bg-background/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-0 -mb-px">
          {TABS.map(({ name, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium whitespace-nowrap transition-all border-b-2 shrink-0',
                  active
                    ? 'border-accent text-accent bg-accent/[0.06]'
                    : 'border-transparent text-muted hover:text-foreground hover:border-separator'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', active ? 'text-accent' : 'text-muted')} />
                {name}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
