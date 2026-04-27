import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors border',
  {
    variants: {
      variant: {
        default: 'bg-accent/10 border-accent/20 text-accent',
        secondary: 'bg-white/5 border-white/[0.08] text-muted',
        success: 'bg-green-500/10 border-green-500/20 text-green-400',
        warning: 'bg-iris-muted border-iris/20 text-iris',
        destructive: 'bg-red-500/10 border-red-500/20 text-red-400',
        outline: 'border-white/10 text-muted bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
