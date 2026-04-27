import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

const tools = [
  { href: '/tools/document-analyzer', label: 'Document Analyzer' },
  { href: '/tools/risk-scorer', label: 'Risk Scorer' },
  { href: '/tools/clause-extractor', label: 'Clause Extractor' },
  { href: '/tools/contract-drafter', label: 'Contract Drafter' },
  { href: '/tools/nda-generator', label: 'NDA Generator' },
  { href: '/tools/plain-english', label: 'Plain English' },
  { href: '/tools/legal-qa', label: 'Legal Q&A' },
]

export function Footer() {
  return (
    <footer className="border-t border-separator mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <Logo size={24} animated={false} />
          <p className="text-xs text-muted leading-relaxed max-w-[200px]">
            Open legal document tools for lawyers and operators.
          </p>
          <p className="text-[11px] text-muted-dark">Not legal advice. No files stored.</p>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-widest mb-3">Tools</p>
          <ul className="space-y-2">
            {tools.slice(0, 4).map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="text-xs text-muted hover:text-foreground transition-colors">
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-widest mb-3">More</p>
          <ul className="space-y-2">
            {tools.slice(4).map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="text-xs text-muted hover:text-foreground transition-colors">
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted uppercase tracking-widest mb-3">Privacy</p>
          <ul className="space-y-2">
            {['No authentication', 'No file storage', 'Per-request RAG', 'Free to use'].map((item) => (
              <li key={item} className="text-xs text-muted-dark">{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-separator px-6 py-4">
        <p className="text-center text-[11px] text-muted-dark">
          © {new Date().getFullYear()} LegalDoc
        </p>
      </div>
    </footer>
  )
}
