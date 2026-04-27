'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RotatingTypingLine } from '@/components/landing/rotating-typing-line'
import { Logo } from '@/components/layout/logo'

const stats = [
  { value: '7', label: 'legal workflows' },
  { value: 'PDF', label: 'DOCX and TXT' },
  { value: 'Text-based', label: 'document answers' },
]

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute left-1/2 top-[14%] h-[520px] w-[min(960px,90vw)] -translate-x-1/2 rounded-[26px] legal-surface rotate-[-1.5deg]" />
        <div className="absolute left-[8%] top-[24%] hidden w-72 panel shadow-soft xl:block">
          <div className="border-b border-separator px-4 py-3 text-[10px] uppercase tracking-widest text-muted">Document Analyzer</div>
          <div className="space-y-3 p-4">
            <div className="panel-subtle p-3">
              <p className="text-[10px] uppercase tracking-widest text-teal">Key obligation</p>
              <p className="mt-1 text-xs leading-relaxed text-secondary">Vendor must deliver the security audit report within 10 business days.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="panel-subtle p-3">
                <p className="text-[10px] text-muted">Governing law</p>
                <p className="mt-1 text-xs text-foreground">India</p>
              </div>
              <div className="panel-subtle p-3">
                <p className="text-[10px] text-muted">Notice</p>
                <p className="mt-1 text-xs text-foreground">30 days</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-[8%] top-[21%] hidden w-72 panel shadow-blue xl:block">
          <div className="border-b border-separator px-4 py-3 text-[10px] uppercase tracking-widest text-muted">Risk Register</div>
          <div className="space-y-3 p-4">
            {['Termination notice missing', 'Liability cap ambiguous', 'IP assignment broad'].map((item, index) => (
              <div key={item} className="panel-subtle p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="h-1.5 w-16 rounded bg-accent/70" />
                  <span className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-red-400' : index === 1 ? 'bg-iris' : 'bg-teal'}`} />
                </div>
                <p className="text-[11px] text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edge fade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 72% 58% at 50% 46%, rgba(8,8,8,0.28) 0%, #080808 92%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex justify-center"
        >
          <Logo variant="stacked" size={74} className="max-w-full" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
        >
          Indian-law legal research
          <br />
          <span className="blue-gradient">and document analysis</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Free to use. No signup required. Analyze documents, extract clauses, review
          risk, draft agreements, and ask plain-language questions for Indian-law
          research and document analysis.
        </motion.p>
        <RotatingTypingLine />

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 mb-14 mt-8"
        >
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="gap-2 text-base px-8 w-full sm:w-auto">
              Open Workbench <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/tools/document-analyzer" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8 w-full sm:w-auto">
              <FileSearch className="w-4 h-4" />
              Analyze a Document
            </Button>
          </Link>
          <Link href="/#tools" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="text-base px-8 w-full sm:w-auto">
              See All Tools
            </Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center justify-center gap-12 flex-wrap"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-accent">{stat.value}</div>
              <div className="text-xs text-muted mt-1 tracking-wide">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #080808)' }}
      />
    </section>
  )
}
