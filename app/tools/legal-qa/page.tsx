'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { MessageSquare, Send, User, Scale } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolLayout } from '@/components/tools/tool-layout'
import { FileUpload } from '@/components/tools/file-upload'
import { SourceViewer, SourceViewerRef } from '@/components/tools/source-viewer'
import { CitationList } from '@/components/tools/citation-list'
import { ConfidenceBadge } from '@/components/tools/confidence-badge'
import { MarkdownContent } from '@/components/tools/document-viewer'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api, NonIndianLawError, RateLimitError } from '@/lib/api'
import type { Citation, ConfidenceLevel } from '@/lib/api'
import { saveDocument, loadDocument, clearDocument, registerUnloadClear } from '@/lib/document-store'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-error'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  confidence?: ConfidenceLevel
}

const SAMPLE_QUESTIONS = [
  'What are the termination conditions in this contract?',
  'Who owns the intellectual property?',
  'What are the payment terms and penalties?',
  'Explain the non-compete clause.',
  'What does the Indian Contract Act say about consideration?',
  'What are my rights under the Consumer Protection Act, 2019?',
]

function LegalQAContent() {
  const searchParams = useSearchParams()
  const [file, setFile] = useState<File | null>(null)
  const [documentText, setDocumentText] = useState('')
  const [fileName, setFileName] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const sourceRef = useRef<SourceViewerRef>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  // Track the last query auto-submitted from URL params to prevent duplicate calls
  const autoSubmittedQuery = useRef<string | null>(null)

  useEffect(() => {
    const saved = loadDocument()
    if (saved && !documentText) {
      setDocumentText(saved.text)
      setFileName(saved.fileName)
    }
    return registerUnloadClear()
  }, [])

  const ask = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return toast.error('Please enter a question')
    setLoading(true)
    setQuestion('')

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])

    try {
      const data = await api.researchQuery(trimmed, documentText || undefined)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        confidence: data.confidence,
      }])
    } catch (outerErr: unknown) {
      // Non-Indian law or rate limit: show dialog/toast, remove user message, do not fallback
      if (outerErr instanceof NonIndianLawError || outerErr instanceof RateLimitError) {
        handleApiError(outerErr)
        setMessages(prev => prev.slice(0, -1))
        return
      }
      // researchQuery unavailable (corpus offline) — fall back to document Q&A
      if (documentText) {
        try {
          const data = await api.legalQA(trimmed, documentText)
          setMessages(prev => [...prev, { role: 'assistant', content: data.result }])
        } catch (e: unknown) {
          handleApiError(e)
          setMessages(prev => prev.slice(0, -1))
        }
      } else {
        toast.error('Upload a document or ask about Indian law to get started')
        setMessages(prev => prev.slice(0, -1))
      }
    } finally {
      setLoading(false)
    }
  }, [documentText])

  // Auto-submit from ?q= param (e.g. redirected from Document Analyzer)
  // Guard by tracking the exact query string to prevent double-fire on Suspense remount
  useEffect(() => {
    const q = searchParams.get('q')
    if (!q || autoSubmittedQuery.current === q) return
    autoSubmittedQuery.current = q
    ask(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Scroll to bottom of the chat container (not the page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleFile = (f: File, nextText: string) => {
    setFile(f)
    setDocumentText(nextText)
    setFileName(f.name)
    setMessages([])
    saveDocument({ text: nextText, fileName: f.name })
  }

  const handleClear = () => {
    setFile(null)
    setDocumentText('')
    setFileName('')
    setMessages([])
    clearDocument()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(question)
    }
  }

  return (
    <ToolLayout
      icon={MessageSquare}
      name="Legal Q&A"
      description="Ask legal questions about Indian law or your uploaded document. Answers are grounded in retrieved legal authorities and document excerpts."
      category="Understand"
      inputPanel={
        <div className="flex flex-col gap-4 h-full">
          <div className="panel p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
            <div>
              <p className="panel-label mb-3">Upload Document (Optional)</p>
              <FileUpload onFile={handleFile} onClear={handleClear} />
              {documentText && (
                <>
                  <p className="text-[11px] text-muted mt-2 px-1">
                    {documentText.length.toLocaleString()} characters loaded
                  </p>
                  <div className="mt-2">
                    <SourceViewer ref={sourceRef} file={file} text={documentText} fileName={fileName} />
                  </div>
                </>
              )}
              {!documentText && (
                <p className="text-[11px] text-muted-dark mt-2 px-1">
                  No document? Ask Indian-law questions using the public legal corpus.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sample Questions</Label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    disabled={loading}
                    className="tool-chip text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
      outputPanel={
        <div
          className="rounded-[18px] macos-card flex flex-col overflow-hidden"
          style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-separator flex-shrink-0 bg-surface/70">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-accent"
                style={{ animation: loading ? 'pulse 1s ease-in-out infinite' : 'none' }}
              />
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Conversation</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="text-[11px] text-muted hover:text-red-400 transition-colors"
              >
                Clear chat
              </button>
            )}
          </div>

          {/* Messages — scrollable area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-16">
                <div className="w-14 h-14 rounded-[14px] bg-white/[0.035] border border-card-border flex items-center justify-center">
                  <Scale className="w-6 h-6 text-muted" />
                </div>
                <div>
                  <p className="text-sm text-muted">Ask a question to begin</p>
                  <p className="text-xs text-muted-dark mt-1">Upload a document or ask about Indian law</p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scale className="w-3.5 h-3.5 text-accent" />
                    </div>
                  )}

                  <div className={cn('max-w-[85%] space-y-1.5', msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start')}>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-accent/15 border border-accent/25 text-foreground/90 rounded-br-sm text-[13px] leading-6'
                          : 'bg-white/[0.04] border border-separator rounded-bl-sm w-full'
                      )}
                    >
                      {msg.role === 'user' ? (
                        <p>{msg.content}</p>
                      ) : (
                        <MarkdownContent
                          content={msg.content}
                          className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        />
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.confidence && (
                      <ConfidenceBadge level={msg.confidence} className="ml-1" />
                    )}
                    {msg.citations && msg.citations.length > 0 && (
                      <CitationList citations={msg.citations} className="px-1" />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-separator flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing animation */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Scale className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="bg-white/[0.04] border border-separator rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-accent/60"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-separator bg-surface/50 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question… (Enter to send, Shift+Enter for new line)"
                className="min-h-[44px] max-h-[120px] resize-none flex-1 text-[13px]"
                disabled={loading}
              />
              <button
                onClick={() => ask(question)}
                disabled={!question.trim() || loading}
                className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-white hover:bg-accent/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      }
    />
  )
}

export default function LegalQAPage() {
  return (
    <Suspense>
      <LegalQAContent />
    </Suspense>
  )
}
