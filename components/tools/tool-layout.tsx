'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { ToolTabs } from '@/components/tools/tool-tabs'

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
      {/* Tool header */}
      <div className="border-b border-separator bg-background/[0.72] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <AnimatedIcon icon={Icon} className="h-11 w-11" iconClassName="h-5 w-5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
                  <Badge variant="default">{category}</Badge>
                </div>
                <p className="text-xs text-muted max-w-2xl leading-relaxed">{description}</p>
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

      {/* Cross-tool navigation tabs */}
      <ToolTabs />

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-7">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {inputPanel}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
            className="lg:col-span-3"
          >
            {outputPanel}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
