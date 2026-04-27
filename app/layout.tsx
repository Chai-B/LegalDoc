import type { Metadata } from 'next'
import './globals.css'
import { AppBackground } from '@/components/layout/app-background'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'LegalDoc',
    template: '%s | LegalDoc',
  },
  description: 'Analyze, draft, and understand legal documents with a stateless, no-login legal AI workbench.',
  keywords: ['legal AI', 'contract analysis', 'legal document', 'NDA generator', 'clause extractor'],
  applicationName: 'LegalDoc',
  openGraph: {
    title: 'LegalDoc',
    description: 'Analyze, draft, and understand legal documents.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LegalDoc',
    description: 'Analyze, draft, and understand legal documents.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased">
        <AppBackground />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F5F5F7',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
