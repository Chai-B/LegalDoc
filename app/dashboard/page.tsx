'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSearch,
  AlertTriangle,
  SplitSquareHorizontal,
  FilePen,
  FileSignature,
  BookOpen,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatedIcon } from '@/components/ui/animated-icon'

const tools = [
  {
    href: '/tools/document-analyzer',
    icon: FileSearch,
    name: 'Document Analyzer',
    description: 'The main workflow: facts, obligations, risk register, missing protections, and negotiation points.',
    category: 'Analyze',
    filterKey: 'analyze',
    categoryVariant: 'default' as const,
    size: 'large',
  },
  {
    href: '/tools/risk-scorer',
    icon: AlertTriangle,
    name: 'Risk Scorer',
    description: 'Score contract risk 0–100 and red-flag dangerous clauses.',
    category: 'Analyze',
    filterKey: 'analyze',
    categoryVariant: 'default' as const,
    size: 'medium',
  },
  {
    href: '/tools/clause-extractor',
    icon: SplitSquareHorizontal,
    name: 'Clause Extractor',
    description: 'Extract and categorize every clause by type and risk level.',
    category: 'Analyze',
    filterKey: 'analyze',
    categoryVariant: 'default' as const,
    size: 'medium',
  },
  {
    href: '/tools/contract-drafter',
    icon: FilePen,
    name: 'Contract Drafter',
    description: 'Describe your deal in plain English — get a full contract.',
    category: 'Draft',
    filterKey: 'draft',
    categoryVariant: 'secondary' as const,
    size: 'medium',
  },
  {
    href: '/tools/nda-generator',
    icon: FileSignature,
    name: 'NDA Generator',
    description: 'Generate mutual or one-way NDAs instantly.',
    category: 'Draft',
    filterKey: 'draft',
    categoryVariant: 'secondary' as const,
    size: 'small',
  },
  {
    href: '/tools/plain-english',
    icon: BookOpen,
    name: 'Plain English',
    description: 'Translate any legal clause into plain language.',
    category: 'Understand',
    filterKey: 'understand',
    categoryVariant: 'warning' as const,
    size: 'small',
  },
  {
    href: '/tools/legal-qa',
    icon: MessageSquare,
    name: 'Legal Q&A',
    description: 'Ask questions about your document and get answers from the text.',
    category: 'Understand',
    filterKey: 'understand',
    categoryVariant: 'warning' as const,
    size: 'large',
  },
]

const bentoClass = [
  'xl:col-span-2',
  '',
  '',
  '',
  '',
  '',
  'md:col-span-2',
]

const filters = [
  { value: 'all', label: 'All Tools' },
  { value: 'analyze', label: 'Analyze' },
  { value: 'draft', label: 'Draft' },
  { value: 'understand', label: 'Understand' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

export default function Dashboard() {
  const [tab, setTab] = useState('all')
  const filteredTools = tab === 'all' ? tools : tools.filter((tool) => tool.filterKey === tab)

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <p className="text-xs font-medium text-accent uppercase tracking-widest mb-2">
            Legal Workbench
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Indian-law research and document analysis tools
          </h1>
          <p className="text-sm text-muted">
            Free to use. No signup required. Analyze documents, review clauses, and ask plain-language questions while your files stay available only during your session.
          </p>
        </motion.div>

        <div className="mb-8 flex flex-wrap gap-2">
          <span className="tool-chip">7 public workflows</span>
          <span className="tool-chip">PDF, DOCX, TXT</span>
          <span className="tool-chip">Answers from your document</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = tab === filter.value

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setTab(filter.value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'border-accent bg-accent text-background'
                      : 'border-card-border text-muted hover:border-card-border-hover hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={container}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.href}
                variants={item}
                className={bentoClass[index]}
              >
                <ToolCard tool={tool} featured={index === 0} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ToolCard({
  tool,
  featured,
}: {
  tool: (typeof tools)[0]
  featured?: boolean
}) {
  return (
    <Link href={tool.href} className="block h-full">
      <div className="group panel relative flex h-full min-h-[220px] flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-card-hover">
        {featured && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        )}
        <div className="mb-5 flex items-start justify-between gap-3">
          <AnimatedIcon icon={tool.icon} />
          <Badge variant={tool.categoryVariant}>{tool.category}</Badge>
        </div>
        <div className="flex flex-1 flex-col">
          <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{tool.name}</h3>
          <p className="max-w-xl text-sm leading-6 text-muted">
            {tool.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-card-border pt-4">
            <span className="text-xs font-medium text-secondary">
              {featured ? 'Primary workflow' : 'Open tool'}
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </div>
        </div>
      </div>
    </Link>
  )
}
