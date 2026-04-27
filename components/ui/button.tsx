import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex min-w-0 items-center justify-center whitespace-normal text-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover shadow-blue-sm active:scale-[0.98]',
        secondary: 'bg-surface-elevated border border-card-border text-foreground hover:bg-card-hover hover:border-card-border-hover',
        ghost: 'text-muted hover:text-foreground hover:bg-white/5',
        outline: 'border border-accent/30 text-accent hover:bg-accent/10',
        destructive: 'bg-red-950/50 border border-red-500/20 text-red-400 hover:bg-red-950/70',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-7 px-3 text-xs',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
