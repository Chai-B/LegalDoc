'use client'

import { useEffect, useState } from 'react'

const phrases = [
  'Review contracts for obligations, risk, and missing protections.',
  'Ask questions grounded in the document, not generic guesses.',
  'Draft NDAs and agreements from practical deal facts.',
]

export function RotatingTypingLine() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = phrases[phraseIndex]
    const complete = length === phrase.length
    const empty = length === 0

    const delay = complete && !deleting ? 1300 : deleting ? 24 : 38
    const timer = window.setTimeout(() => {
      if (complete && !deleting) {
        setDeleting(true)
        return
      }
      if (empty && deleting) {
        setDeleting(false)
        setPhraseIndex((index) => (index + 1) % phrases.length)
        return
      }
      setLength((value) => value + (deleting ? -1 : 1))
    }, delay)

    return () => window.clearTimeout(timer)
  }, [deleting, length, phraseIndex])

  return (
    <p className="mx-auto mt-5 min-h-[32px] max-w-2xl text-sm leading-8 text-secondary md:text-base">
      <span>{phrases[phraseIndex].slice(0, length)}</span>
      <span className="ml-0.5 inline-block h-5 w-px translate-y-1 bg-accent" aria-hidden />
    </p>
  )
}
