'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  FileSearch,
  AlertTriangle,
  SplitSquareHorizontal,
  FilePen,
  FileSignature,
  BookOpen,
  MessageSquare,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatedIcon } from '@/components/ui/animated-icon'

const tools = [
  {
    href: '/tools/document-analyzer',
    icon: FileSearch,
    name: 'Document Analyzer',
    description: 'First-pass review with parties, obligations, dates, risk register, missing protections, and negotiation points.',
    category: 'Analyze',
    variant: 'default' as const,
  },
  {
    href: '/tools/risk-scorer',
    icon: AlertTriangle,
    name: 'Risk Scorer',
    description: 'Score contract risk 0–100. Flags dangerous clauses with plain-English explanations.',
    category: 'Analyze',
    variant: 'default' as const,
  },
  {
    href: '/tools/clause-extractor',
    icon: SplitSquareHorizontal,
    name: 'Clause Extractor',
    description: 'Pull and categorize every clause: payment, IP, termination, liability, and more.',
    category: 'Analyze',
    variant: 'default' as const,
  },
  {
    href: '/tools/contract-drafter',
    icon: FilePen,
    name: 'Contract Drafter',
    description: 'Describe your deal in plain English — get a complete, ready-to-use contract draft.',
    category: 'Draft',
    variant: 'secondary' as const,
  },
  {
    href: '/tools/nda-generator',
    icon: FileSignature,
    name: 'NDA Generator',
    description: 'Mutual or one-way NDAs tailored to your parties, jurisdiction, and duration.',
    category: 'Draft',
    variant: 'secondary' as const,
  },
  {
    href: '/tools/plain-english',
    icon: BookOpen,
    name: 'Plain English',
    description: 'Translate dense legal language into operational meaning, implications, and watch-outs.',
    category: 'Understand',
    variant: 'warning' as const,
  },
  {
    href: '/tools/legal-qa',
    icon: MessageSquare,
    name: 'Legal Q&A',
    description: 'Upload a doc, ask anything. Answers grounded in the actual document text.',
    category: 'Understand',
    variant: 'warning' as const,
  },
]

const spanClass = ['xl:col-span-2', '', '', '', 'md:col-span-2 xl:col-span-1', '', 'xl:col-span-2']

export function ToolsShowcase() {
  return (
    <section id="tools" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium text-accent uppercase tracking-widest mb-3">
            The Toolkit
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            7 tools. One platform.
          </h2>
          <p className="text-muted max-w-xl mx-auto text-lg">
            Practical legal workflows, not toy demos. Start with document analysis, then move into targeted review tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className={spanClass[i]}
            >
              <Link
                href={tool.href}
                className="group panel block h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-card-hover"
              >
                <div className="flex h-full min-h-[220px] flex-col">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <AnimatedIcon icon={tool.icon} />
                    <Badge variant={tool.variant}>{tool.category}</Badge>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{tool.name}</h3>
                  <p className="max-w-xl text-sm leading-6 text-muted">{tool.description}</p>
                  <div className="mt-auto flex items-center justify-between border-t border-card-border pt-4">
                    <span className="text-xs font-medium text-secondary">Open workflow</span>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA below grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link href="/dashboard">
            <span className="tool-chip cursor-pointer text-sm text-accent hover:bg-white/[0.06]">
              View All Tools in Dashboard <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
