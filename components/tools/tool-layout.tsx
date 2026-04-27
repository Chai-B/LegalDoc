'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatedIcon } from '@/components/ui/animated-icon'

interface ToolLayoutProps {
  icon: LucideIcon
  name: string
  description: string
  category: string
  inputPanel: React.ReactNode
  outputPanel: React.ReactNode
}

export function ToolLayout({
  icon: Icon,
  name,
  description,
  category,
  inputPanel,
  outputPanel,
}: ToolLayoutProps) {
  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="border-b border-separator bg-background/[0.72] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <AnimatedIcon icon={Icon} className="h-12 w-12" iconClassName="h-6 w-6" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
                  <Badge variant="default">{category}</Badge>
                </div>
                <p className="text-sm text-muted max-w-2xl">{description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="tool-chip">No login</span>
              <span className="tool-chip">No file storage</span>
              <span className="tool-chip">Stateless processing</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {inputPanel}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-3"
          >
            {outputPanel}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
