'use client'

import { motion } from 'framer-motion'
import { Shield, Zap, Lock, FileText, Search, Scale } from 'lucide-react'
import { AnimatedIcon } from '@/components/ui/animated-icon'

const features = [
  {
    icon: FileText,
    title: 'Review-First Output',
    description: 'Document type, parties, obligations, deadlines, risk register, missing protections, and negotiation points in one pass.',
  },
  {
    icon: Shield,
    title: 'Issue Spotting',
    description: 'Risk scoring highlights liability, termination, payment, IP, confidentiality, governing law, and enforcement concerns.',
  },
  {
    icon: Lock,
    title: 'Private by Design',
    description: 'Your documents are never stored. Each session is completely isolated and stateless.',
  },
  {
    icon: Zap,
    title: 'Drafting Support',
    description: 'Generate practical first drafts for NDAs and common agreements from structured business facts.',
  },
  {
    icon: Search,
    title: 'Grounded Q&A',
    description: 'Ask document-specific questions. Retrieval runs in memory for each request and answers from relevant excerpts.',
  },
  {
    icon: Scale,
    title: 'No Account Needed',
    description: 'All 7 tools available immediately. No signup, no credit card, no limits, ever.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium text-accent uppercase tracking-widest mb-3">
            Why LegalDoc
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Legal AI that works for{' '}
            <span className="blue-gradient">everyone</span>
          </h2>
          <p className="text-muted max-w-xl mx-auto text-lg">
            Built for lawyers and legal operators who want fast first-pass review without
            account walls, dashboards, or stored client files.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group panel p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-card-hover"
            >
              <AnimatedIcon icon={feature.icon} className="mb-4 h-10 w-10" />
              <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
