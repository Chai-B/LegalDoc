'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedIconProps {
  icon: LucideIcon
  className?: string
  iconClassName?: string
}

export function AnimatedIcon({ icon: Icon, className, iconClassName }: AnimatedIconProps) {
  return (
    <motion.span
      className={cn(
        'animated-line-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-card-border-hover bg-white/[0.04]',
        className
      )}
      whileHover={{ y: -2, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
    >
      <Icon className={cn('h-5 w-5 text-accent', iconClassName)} strokeWidth={1.8} />
    </motion.span>
  )
}
