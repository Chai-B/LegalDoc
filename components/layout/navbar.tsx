'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/layout/logo'

const links = [
  { href: '/tools/document-analyzer', label: 'Analyzer' },
  { href: '/#tools', label: 'Tools' },
  { href: '/dashboard', label: 'Workbench' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'glass' : 'bg-transparent'
      )}
    >
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size={28} className="transition-transform duration-200 group-hover:translate-y-[-1px]" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/tools/document-analyzer"
          className="hidden md:flex items-center gap-1 text-xs font-medium bg-accent hover:bg-accent-hover text-white px-3.5 py-2 rounded-lg transition-colors"
        >
          Analyze
          <ChevronRight className="w-3 h-3" />
        </Link>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-muted hover:text-foreground transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden glass border-t border-separator px-6 py-4 space-y-3"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block text-sm text-muted hover:text-foreground py-2 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-sm text-white bg-accent rounded-lg px-4 py-2 text-center mt-2 hover:bg-accent-hover transition-colors"
            >
              Analyze Document
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
