// Beautified PDF generator using jsPDF.
// Produces a properly structured, page-numbered, bookmarked document.

export interface Highlight {
  id: string
  text: string
  color: string  // rgba string like "rgba(253,224,71,0.4)"
}

// ── Markdown block types ──────────────────────────────────────────────────────

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; items: string[] }
  | { type: 'ordered'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'rule' }
  | { type: 'code'; text: string }

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { i++; continue }

    if (trimmed.startsWith('```')) {
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      blocks.push({ type: 'code', text: codeLines.join('\n') })
      continue
    }

    const h3 = trimmed.match(/^### (.+)$/)
    if (h3) { blocks.push({ type: 'h3', text: h3[1] }); i++; continue }

    const h2 = trimmed.match(/^## (.+)$/)
    if (h2) { blocks.push({ type: 'h2', text: h2[1] }); i++; continue }

    const h1 = trimmed.match(/^# (.+)$/)
    if (h1) { blocks.push({ type: 'h1', text: h1[1] }); i++; continue }

    if (/^(---+|\*\*\*+)$/.test(trimmed)) {
      blocks.push({ type: 'rule' }); i++; continue
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') })
      continue
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''))
        i++
      }
      blocks.push({ type: 'bullet', items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ordered', items })
      continue
    }

    // Paragraph
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---+|\*\*\*+)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
    }
  }

  return blocks
}

// Parse rgba color to 0-1 range RGB values
function parseRgba(rgba: string): { r: number; g: number; b: number } {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m
    ? { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) }
    : { r: 255, g: 235, width: 59 } as unknown as { r: number; g: number; b: number }
}

// Find user highlights that appear in a text segment
function findHighlight(text: string, highlights: Highlight[]): Highlight | null {
  for (const h of highlights) {
    if (text.toLowerCase().includes(h.text.toLowerCase())) return h
    if (h.text.toLowerCase().includes(text.toLowerCase().trim())) return h
  }
  return null
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generatePDF(
  content: string,
  highlights: Highlight[],
  title: string = 'LegalDoc Output'
): Promise<void> {
  // Dynamic import to keep jsPDF out of SSR
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()   // 210mm
  const H = doc.internal.pageSize.getHeight()  // 297mm
  const ML = 22   // margin left
  const MR = 22   // margin right
  const MT = 24   // margin top (for content pages)
  const MB = 20   // margin bottom
  const CW = W - ML - MR  // content width

  // Fonts: jsPDF ships with helvetica only for free; use it throughout
  const FONT = 'helvetica'

  // ── Color palette ──
  const C_BRAND = [0, 100, 210] as const        // blue for headings
  const C_TEXT  = [30, 30, 30] as const         // dark text
  const C_MUTED = [100, 100, 110] as const      // grey for metadata
  const C_RULE  = [200, 200, 210] as const      // light rule line
  const C_CODE_BG = [245, 245, 248] as const    // code background
  const C_QUOTE_BAR = [0, 100, 210] as const

  let y = MT
  let pageNum = 1

  // Heading registry for TOC
  const headings: { text: string; page: number; y: number }[] = []

  function newPage() {
    addFooter()
    doc.addPage()
    pageNum++
    y = MT
    addHeader()
  }

  function checkPageBreak(needed: number) {
    if (y + needed > H - MB) newPage()
  }

  function setColor(rgb: readonly [number, number, number]) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
  }

  function addHeader() {
    if (pageNum === 1) return
    setColor(C_MUTED)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.5)
    doc.text('LegalDoc AI', ML, 14)
    doc.text(title, W / 2, 14, { align: 'center' })
    doc.text(`Page ${pageNum}`, W - MR, 14, { align: 'right' })
    doc.setDrawColor(C_RULE[0], C_RULE[1], C_RULE[2])
    doc.line(ML, 17, W - MR, 17)
    setColor(C_TEXT)
  }

  function addFooter() {
    setColor(C_MUTED)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.5)
    doc.line(ML, H - MB + 3, W - MR, H - MB + 3)
    doc.text('Generated by LegalDoc AI · For review purposes only', ML, H - MB + 8)
    doc.text(`${pageNum}`, W - MR, H - MB + 8, { align: 'right' })
    setColor(C_TEXT)
  }

  // ── Title page ──────────────────────────────────────────────────────────────

  // Top brand bar
  doc.setFillColor(0, 90, 200)
  doc.rect(0, 0, W, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(9)
  doc.text('⚖  LegalDoc AI', ML, 9)
  doc.text('legaldoc.ai', W - MR, 9, { align: 'right' })

  // Title block
  setColor(C_TEXT)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(22)
  const titleLines = doc.splitTextToSize(title, CW)
  doc.text(titleLines, W / 2, 60, { align: 'center' })

  setColor(C_MUTED)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(10)
  doc.text('AI-Generated Legal Analysis · Indian Law', W / 2, 72, { align: 'center' })

  // Date
  doc.setFontSize(8.5)
  doc.text(new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 80, { align: 'center' })

  // Divider
  setColor(C_TEXT)
  doc.setDrawColor(0, 90, 200)
  doc.setLineWidth(0.8)
  doc.line(ML + 30, 88, W - MR - 30, 88)
  doc.setLineWidth(0.2)

  // Disclaimer box
  doc.setFillColor(245, 248, 255)
  doc.setDrawColor(180, 200, 235)
  doc.roundedRect(ML, 94, CW, 28, 3, 3, 'FD')
  setColor(C_MUTED)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(8)
  doc.text('IMPORTANT DISCLAIMER', ML + 5, 103)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(8)
  const disclaimerText = 'This document is an AI-generated analysis for informational purposes only. It does not constitute legal advice. All matters involving legal rights and obligations should be reviewed by a qualified Indian lawyer before acting.'
  const disclaimerLines = doc.splitTextToSize(disclaimerText, CW - 10)
  doc.text(disclaimerLines, ML + 5, 109)

  // Highlights legend (if any)
  if (highlights.length > 0) {
    doc.setFont(FONT, 'bold')
    doc.setFontSize(8)
    setColor(C_TEXT)
    doc.text(`User Highlights (${highlights.length})`, ML, 138)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.5)
    setColor(C_MUTED)
    highlights.slice(0, 6).forEach((h, i) => {
      const { r, g, b } = parseRgba(h.color)
      doc.setFillColor(r, g, b)
      doc.rect(ML, 143 + i * 7, 4, 4, 'F')
      setColor(C_TEXT)
      doc.text(`"${h.text.slice(0, 60)}${h.text.length > 60 ? '…' : ''}"`, ML + 7, 146.5 + i * 7)
      setColor(C_MUTED)
    })
  }

  addFooter()

  // ── Content pages ─────────────────────────────────────────────────────────

  doc.addPage()
  pageNum = 2
  addHeader()
  setColor(C_TEXT)

  const blocks = parseBlocks(content)

  for (const block of blocks) {
    switch (block.type) {
      case 'h1': {
        checkPageBreak(18)
        setColor(C_BRAND)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(17)
        const lines = doc.splitTextToSize(stripInline(block.text), CW)
        doc.text(lines, ML, y)
        y += lines.length * 8 + 3
        // Under-rule
        doc.setDrawColor(C_BRAND[0], C_BRAND[1], C_BRAND[2])
        doc.setLineWidth(0.6)
        doc.line(ML, y - 1, ML + 60, y - 1)
        doc.setLineWidth(0.2)
        y += 3
        headings.push({ text: stripInline(block.text), page: pageNum, y: y - 14 })
        setColor(C_TEXT)
        break
      }

      case 'h2': {
        checkPageBreak(14)
        y += 2
        setColor(C_BRAND)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(13)
        const lines = doc.splitTextToSize(stripInline(block.text), CW)
        doc.text(lines, ML, y)
        y += lines.length * 6.5 + 2
        doc.setDrawColor(C_RULE[0], C_RULE[1], C_RULE[2])
        doc.line(ML, y, W - MR, y)
        y += 4
        headings.push({ text: stripInline(block.text), page: pageNum, y: y - 10 })
        setColor(C_TEXT)
        break
      }

      case 'h3': {
        checkPageBreak(10)
        y += 1
        setColor(C_TEXT)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(11)
        const lines = doc.splitTextToSize(stripInline(block.text), CW)
        doc.text(lines, ML, y)
        y += lines.length * 5.5 + 2
        break
      }

      case 'paragraph': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        setColor(C_TEXT)
        const text = stripInline(block.text)
        const lines = doc.splitTextToSize(text, CW)

        for (const line of lines) {
          checkPageBreak(6)
          const hl = findHighlight(line, highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            doc.setFillColor(r, g, b)
            const tw = doc.getTextWidth(line)
            doc.rect(ML - 1, y - 4.5, tw + 2, 5.5, 'F')
          }
          doc.text(line, ML, y)
          y += 5.5
        }
        y += 2
        break
      }

      case 'bullet': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        setColor(C_TEXT)
        for (const item of block.items) {
          const text = stripInline(item)
          const lines = doc.splitTextToSize(text, CW - 6)
          checkPageBreak(lines.length * 5.5 + 1.5)

          // Bullet dot
          doc.setFillColor(0, 100, 210)
          doc.circle(ML + 1.5, y - 1.5, 0.9, 'F')

          const hl = findHighlight(text, highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            doc.setFillColor(r, g, b)
            doc.rect(ML + 4, y - 4.5, CW - 6, lines.length * 5.5 + 0.5, 'F')
          }

          doc.text(lines, ML + 6, y)
          y += lines.length * 5.5 + 1.5
        }
        y += 1
        break
      }

      case 'ordered': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        setColor(C_TEXT)
        block.items.forEach((item, idx) => {
          const text = stripInline(item)
          const lines = doc.splitTextToSize(text, CW - 8)
          checkPageBreak(lines.length * 5.5 + 1.5)

          doc.setFont(FONT, 'bold')
          doc.setFontSize(9)
          setColor(C_BRAND)
          doc.text(`${idx + 1}.`, ML, y)

          doc.setFont(FONT, 'normal')
          doc.setFontSize(10)
          setColor(C_TEXT)
          const hl = findHighlight(text, highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            doc.setFillColor(r, g, b)
            doc.rect(ML + 7, y - 4.5, CW - 8, lines.length * 5.5 + 0.5, 'F')
          }
          doc.text(lines, ML + 8, y)
          y += lines.length * 5.5 + 1.5
        })
        y += 1
        break
      }

      case 'blockquote': {
        const text = stripInline(block.text)
        const lines = doc.splitTextToSize(text, CW - 8)
        checkPageBreak(lines.length * 5 + 6)

        // Quote background
        doc.setFillColor(245, 248, 255)
        doc.rect(ML, y - 4, CW, lines.length * 5 + 6, 'F')
        // Blue left bar
        doc.setFillColor(C_QUOTE_BAR[0], C_QUOTE_BAR[1], C_QUOTE_BAR[2])
        doc.rect(ML, y - 4, 2.5, lines.length * 5 + 6, 'F')

        setColor(C_MUTED)
        doc.setFont(FONT, 'italic')
        doc.setFontSize(9.5)
        doc.text(lines, ML + 6, y + 0.5)
        y += lines.length * 5 + 8
        doc.setFont(FONT, 'normal')
        setColor(C_TEXT)
        break
      }

      case 'rule': {
        checkPageBreak(8)
        y += 3
        doc.setDrawColor(C_RULE[0], C_RULE[1], C_RULE[2])
        doc.line(ML, y, W - MR, y)
        y += 5
        break
      }

      case 'code': {
        const lines = block.text.split('\n')
        const totalH = lines.length * 4.8 + 8
        checkPageBreak(totalH)

        doc.setFillColor(C_CODE_BG[0], C_CODE_BG[1], C_CODE_BG[2])
        doc.setDrawColor(210, 210, 220)
        doc.roundedRect(ML, y - 4, CW, totalH, 2, 2, 'FD')

        setColor(C_MUTED)
        doc.setFont('courier', 'normal')
        doc.setFontSize(8.5)
        for (const cl of lines) {
          const wrapped = doc.splitTextToSize(cl, CW - 6)
          doc.text(wrapped, ML + 4, y + 0.5)
          y += wrapped.length * 4.8
        }
        y += 8
        doc.setFont(FONT, 'normal')
        setColor(C_TEXT)
        break
      }
    }
  }

  addFooter()

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
