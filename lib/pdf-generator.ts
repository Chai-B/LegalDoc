export interface Highlight {
  id: string
  text: string
  color: string
}

// ── Block types ──────────────────────────────────────────────────────────────

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; items: string[] }
  | { type: 'ordered'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'rule' }
  | { type: 'code'; text: string }

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

// ── Inline styled text rendering ──────────────────────────────────────────────

type InlineSeg = { text: string; bold: boolean; italic: boolean; code: boolean }

function parseInlineSegs(raw: string): InlineSeg[] {
  const out: InlineSeg[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) out.push({ text: raw.slice(last, m.index), bold: false, italic: false, code: false })
    if      (m[1]) out.push({ text: m[1], bold: true,  italic: false, code: false })
    else if (m[2]) out.push({ text: m[2], bold: false, italic: true,  code: false })
    else if (m[3]) out.push({ text: m[3], bold: false, italic: false, code: true  })
    last = m.index + m[0].length
  }
  if (last < raw.length) out.push({ text: raw.slice(last), bold: false, italic: false, code: false })
  return out
}


function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const t = raw.trim()

    if (!t) { i++; continue }

    // Fenced code
    if (t.startsWith('```')) {
      i++
      const code: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++ }
      i++
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    // Headings
    const h3 = t.match(/^### (.+)$/)
    if (h3) { blocks.push({ type: 'h3', text: h3[1] }); i++; continue }
    const h2 = t.match(/^## (.+)$/)
    if (h2) { blocks.push({ type: 'h2', text: h2[1] }); i++; continue }
    const h1 = t.match(/^# (.+)$/)
    if (h1) { blocks.push({ type: 'h1', text: h1[1] }); i++; continue }

    // Horizontal rule
    if (/^(---+|\*\*\*+)$/.test(t)) { blocks.push({ type: 'rule' }); i++; continue }

    // Blockquote
    if (t.startsWith('> ')) {
      const lines2: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        lines2.push(lines[i].trim().slice(2)); i++
      }
      blocks.push({ type: 'blockquote', text: lines2.join(' ') })
      continue
    }

    // Table
    if (t.startsWith('|') && t.endsWith('|')) {
      const tlines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tlines.push(lines[i].trim()); i++ }
      const isSep = (r: string) => /^[\s|:\-]+$/.test(r)
      const valid = tlines.filter((r, idx) => !(idx === 1 && isSep(r)))
      const split = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
      if (valid.length >= 2) {
        blocks.push({ type: 'table', headers: split(valid[0]), rows: valid.slice(1).map(split) })
      }
      continue
    }

    // Unordered list
    if (/^[-*•]\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, '')); i++
      }
      blocks.push({ type: 'bullet', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++
      }
      blocks.push({ type: 'ordered', items })
      continue
    }

    // Paragraph
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---+|\*\*\*+)$/.test(lines[i].trim())
    ) { para.push(lines[i].trim()); i++ }
    if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') })
  }

  return blocks
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseRgba(rgba: string): { r: number; g: number; b: number } {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : { r: 253, g: 224, b: 71 }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Translates webapp dark-mode section color to white-bg print color
// Matches DocumentViewer: risk→red, missing/weak→iris, recommend/negotiat→teal, default→accent
function h2SectionColor(text: string): [number, number, number] {
  const lower = text.toLowerCase()
  if (/risk|danger|critical/i.test(lower))                return hexToRgb('#b91c1c') // red-700
  if (/missing|weak|concern|gap/i.test(lower))             return hexToRgb('#5b21b6') // violet-700 (iris)
  if (/recommend|negotiat|insight|action/i.test(lower))    return hexToRgb('#0f766e') // teal-700
  return hexToRgb('#1d4ed8')                                                           // blue-700 (accent)
}

function findHighlight(text: string, highlights: Highlight[]): Highlight | null {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const nt = n(text)
  for (const h of highlights) {
    const nh = n(h.text)
    if (nt && nt.length > 2 && (nh.includes(nt) || nt.includes(nh))) return h
  }
  return null
}

// ── Filename generator ───────────────────────────────────────────────────────

export function generateFilename(content: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
      .replace(/\s+/g, '_').replace(/_+/g, '_').slice(0, 30)

  // Detect document type from first heading
  let docType = ''
  for (const line of content.split('\n').slice(0, 40)) {
    const m = line.match(/^#{1,2} (.+)$/)
    if (!m) continue
    const h = m[1].toLowerCase().trim()
    if (/non.?disclosure|nda/i.test(h))         { docType = 'nda'; break }
    if (/risk score|risk analysis/i.test(h))     { docType = 'risk_analysis'; break }
    if (/clause extract/i.test(h))               { docType = 'clause_extract'; break }
    if (/plain english/i.test(h))                { docType = 'plain_english'; break }
    if (/document analy/i.test(h))               { docType = 'analysis'; break }
    if (/employment/i.test(h))                   { docType = 'employment_contract'; break }
    if (/service agreement/i.test(h))            { docType = 'service_agreement'; break }
    if (/consultancy|consulting/i.test(h))       { docType = 'consultancy_agreement'; break }
    if (/contract|agreement/i.test(h))           { docType = 'contract'; break }
    if (m[1].trim().length > 3)                  { docType = slug(m[1]); break }
  }

  // Extract party names — "between X and Y"
  let parties: [string, string] | null = null
  const bm = content.match(/\bbetween\s+([\w][^,\n]{2,50?}?)\s+(?:and|&)\s+([\w][^,\n.]{2,50?}?)(?=[,\n.)])/i)
  if (bm) {
    const a = bm[1].trim().split(/\s+/).slice(0, 4).join(' ')
    const b = bm[2].trim().split(/\s+/).slice(0, 4).join(' ')
    if (a.length > 2 && b.length > 2) parties = [a, b]
  }

  if (!parties) {
    const pa = content.match(/(?:Disclosing Party|Party A|Client|Licensor)[:\s]+([A-Z][\w\s]{2,30}?)(?=[,\n])/i)
    const pb = content.match(/(?:Receiving Party|Party B|Service Provider|Licensee)[:\s]+([A-Z][\w\s]{2,30}?)(?=[,\n])/i)
    if (pa && pb) {
      const a = pa[1].trim().split(/\s+/).slice(0, 3).join(' ')
      const b = pb[1].trim().split(/\s+/).slice(0, 3).join(' ')
      if (a.length > 2 && b.length > 2) parties = [a, b]
    }
  }

  if (parties && docType) return `${slug(parties[0])}_v_${slug(parties[1])}_${docType}`
  if (parties)            return `${slug(parties[0])}_v_${slug(parties[1])}`
  if (docType)            return docType
  return 'legaldoc_output'
}

// ── PDF generation ───────────────────────────────────────────────────────────

export async function generatePDF(
  content: string,
  highlights: Highlight[],
  filename: string = 'legaldoc_output'
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W  = doc.internal.pageSize.getWidth()   // 210
  const H  = doc.internal.pageSize.getHeight()  // 297
  const ML = 20                                  // left margin
  const MR = 20                                  // right margin
  const CW = W - ML - MR                        // content width: 170
  const FONT = 'helvetica'

  // Header / footer heights
  const HDR_H  = 14   // mm — running header height
  const HDR_Y  = 10   // baseline y for header text
  const FTR_H  = 12   // mm — footer height
  const CONTENT_TOP  = HDR_H + 4   // where content starts
  const CONTENT_BOT  = H - FTR_H   // where content must stop

  let y = CONTENT_TOP
  let pageNum = 1

  // Palette — white-background print, faithful to the webapp's dark-mode palette
  const P = {
    text:      hexToRgb('#111111'),
    textSoft:  hexToRgb('#333333'),
    muted:     hexToRgb('#6b7280'),
    accent:    hexToRgb('#1d4ed8'),
    rule:      hexToRgb('#d1d5db'),
    riskHiBg:  hexToRgb('#fee2e2'),  riskHiTx: hexToRgb('#991b1b'),
    riskMdBg:  hexToRgb('#ede9fe'),  riskMdTx: hexToRgb('#5b21b6'),
    riskLoTg:  hexToRgb('#d1fae5'),  riskLoTx: hexToRgb('#065f46'),
    tblHdrBg:  hexToRgb('#1e3a8a'),
    tblEvenBg: hexToRgb('#f8faff'),
    tblOddBg:  hexToRgb('#ffffff'),
    tblBorder: hexToRgb('#cbd5e1'),
    bqBar:     hexToRgb('#1d4ed8'),
    bqBg:      hexToRgb('#eff6ff'),
    codeBg:    hexToRgb('#f3f4f6'),
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  const rgb = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])

  function checkPageBreak(needed: number) {
    if (y + needed > CONTENT_BOT) { addPage() }
  }

  // ── Logo drawing (scale icon, faithful to favicon.svg) ────────────────────
  function drawLogo(ox: number, oy: number, size: number) {
    const sc = size / 48  // SVG viewBox is 48×48

    // White crossbeam + fulcrum
    stroke([245, 245, 247])
    doc.setLineWidth(sc * 3)
    doc.line(ox + 9 * sc, oy + 18 * sc, ox + 39 * sc, oy + 18 * sc) // crossbeam
    doc.line(ox + 24 * sc, oy + 12 * sc, ox + 24 * sc, oy + 34 * sc) // fulcrum

    // Top circle — #007AFF
    fill([0, 122, 255])
    stroke([0, 122, 255])
    doc.circle(ox + 24 * sc, oy + 11 * sc, 3 * sc, 'F')

    // Pan arcs — 3-segment polyline approximation of Q(start, ctrl, end) bezier
    // Left pan: Q 12 33 18 26 from M 6 26  → sample at t=0, 0.33, 0.67, 1
    doc.setLineWidth(sc * 2.75)
    stroke([126, 184, 255]) // #7EB8FF
    doc.line(ox+6*sc, oy+26*sc, ox+9.96*sc,  oy+29.09*sc)
    doc.line(ox+9.96*sc, oy+29.09*sc, ox+14.04*sc, oy+29.09*sc)
    doc.line(ox+14.04*sc, oy+29.09*sc, ox+18*sc,   oy+26*sc)

    // Right pan: Q 36 33 42 26 from M 30 26
    stroke([73, 214, 200]) // #49D6C8
    doc.line(ox+30*sc, oy+26*sc, ox+33.96*sc, oy+29.09*sc)
    doc.line(ox+33.96*sc, oy+29.09*sc, ox+38.04*sc, oy+29.09*sc)
    doc.line(ox+38.04*sc, oy+29.09*sc, ox+42*sc,    oy+26*sc)

    doc.setLineWidth(0.2)
  }

  // ── Running header ─────────────────────────────────────────────────────────
  function addHeader() {
    // Branded bar
    fill([14, 58, 138]) // blue-900
    doc.rect(0, 0, W, HDR_H, 'F')

    // Logo icon (7mm, vertically centred in HDR_H=14mm → top at (14-7)/2=3.5)
    const LOGO_SIZE = 7
    const LOGO_X = ML
    const LOGO_Y = (HDR_H - LOGO_SIZE) / 2
    drawLogo(LOGO_X, LOGO_Y, LOGO_SIZE)

    // Brand name — starts just after the logo
    doc.setTextColor(255, 255, 255)
    doc.setFont(FONT, 'bold')
    doc.setFontSize(9)
    doc.text('LegalDoc', LOGO_X + LOGO_SIZE + 2.5, HDR_Y - 0.5)

    // Filename (center, muted white)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(180, 200, 235)
    const label = filename.replace(/_/g, ' ')
    doc.text(label, W / 2, HDR_Y - 0.5, { align: 'center' })

    // Page number (right)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(200, 215, 240)
    doc.text(`${pageNum}`, W - MR, HDR_Y - 0.5, { align: 'right' })
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  function addFooter() {
    stroke(P.rule)
    doc.setLineWidth(0.15)
    doc.line(ML, H - FTR_H + 2, W - MR, H - FTR_H + 2)
    rgb(P.muted)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(7)
    doc.text('AI-generated analysis — for informational purposes only. Not legal advice.', ML, H - FTR_H + 7)
    doc.text(
      new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
      W - MR, H - FTR_H + 7, { align: 'right' }
    )
  }

  function addPage() {
    addFooter()
    doc.addPage()
    pageNum++
    y = CONTENT_TOP
    addHeader()
  }

  // ── Inline styled text layout ─────────────────────────────────────────────
  // Word-wraps inline segments (bold/italic/code) to fit maxW; returns lines.
  function layoutInlineText(raw: string, maxW: number, font: string, size: number): InlineSeg[][] {
    const segs = parseInlineSegs(raw)
    const lines: InlineSeg[][] = []
    let curLine: InlineSeg[] = []
    let curW = 0

    const wOf = (s: InlineSeg): number => {
      doc.setFont(s.code ? 'courier' : font, s.bold ? 'bold' : s.italic ? 'italic' : 'normal')
      doc.setFontSize(s.code ? size - 1 : size)
      return doc.getTextWidth(s.text)
    }

    for (const seg of segs) {
      for (const word of seg.text.split(/(\s+)/)) {
        if (!word) continue
        const isWs = /^\s+$/.test(word)
        const w = wOf({ ...seg, text: word })
        if (!isWs && curW + w > maxW && curLine.length > 0) {
          while (curLine.length && /^\s+$/.test(curLine[curLine.length - 1].text)) curLine.pop()
          lines.push(curLine); curLine = []; curW = 0
          if (isWs) continue
        }
        if (isWs && curLine.length === 0) continue
        const prev = curLine[curLine.length - 1]
        if (prev && prev.bold === seg.bold && prev.italic === seg.italic && prev.code === seg.code) {
          prev.text += word; curW += w
        } else {
          curLine.push({ ...seg, text: word }); curW += w
        }
      }
    }
    if (curLine.length) {
      while (curLine.length && /^\s+$/.test(curLine[curLine.length - 1].text)) curLine.pop()
      if (curLine.length) lines.push(curLine)
    }
    doc.setFont(font, 'normal'); doc.setFontSize(size)
    return lines.length ? lines : [[{ text: '', bold: false, italic: false, code: false }]]
  }

  // ── Inline risk-label renderer (mimics webapp badges) ─────────────────────
  // jsPDF doesn't support inline mixed styles easily, so we detect risk phrases
  // within text and draw colored rounded rectangles behind them.
  function drawRiskBadges(text: string, lineX: number, lineY: number) {
    // Called after the line is drawn — we find risk phrases and overlay badges.
    // Simple approach: if the stripped text IS a risk label, colour the whole line.
    const t = text.trim()
    const fs = doc.getFontSize()
    const tw = doc.getTextWidth(t)
    if (/^High[\s\-]?Risk$/i.test(t)) {
      fill(P.riskHiBg); doc.rect(lineX - 1, lineY - fs * 0.35, tw + 2, fs * 0.45 + 1.5, 'F')
      rgb(P.riskHiTx); doc.text(t, lineX, lineY)
    } else if (/^(Medium|Moderate)[\s\-]?Risk$/i.test(t)) {
      fill(P.riskMdBg); doc.rect(lineX - 1, lineY - fs * 0.35, tw + 2, fs * 0.45 + 1.5, 'F')
      rgb(P.riskMdTx); doc.text(t, lineX, lineY)
    } else if (/^Low[\s\-]?Risk$/i.test(t)) {
      fill(P.riskLoTg); doc.rect(lineX - 1, lineY - fs * 0.35, tw + 2, fs * 0.45 + 1.5, 'F')
      rgb(P.riskLoTx); doc.text(t, lineX, lineY)
    }
  }

  // ── Page 1 setup ───────────────────────────────────────────────────────────
  addHeader()

  // ── Render blocks ──────────────────────────────────────────────────────────
  const blocks = parseBlocks(content)

  for (const block of blocks) {
    switch (block.type) {

      // H1 — large, accent blue, underline rule
      case 'h1': {
        checkPageBreak(18)
        y += 4
        doc.setFont(FONT, 'bold')
        doc.setFontSize(16)
        const stripped1 = stripInline(block.text)
        const lines = doc.splitTextToSize(stripped1, CW)
        const hl1 = findHighlight(stripped1, highlights)
        if (hl1) {
          const { r, g, b } = parseRgba(hl1.color)
          fill([r, g, b])
          doc.rect(ML - 1, y - 5, CW + 2, lines.length * 8 + 1.5, 'F')
        }
        rgb(P.accent)
        doc.text(lines, ML, y)
        y += lines.length * 8 + 1.5
        stroke(P.accent)
        doc.setLineWidth(0.5)
        doc.line(ML, y, ML + 50, y)
        doc.setLineWidth(0.2)
        y += 5
        rgb(P.text)
        break
      }

      // H2 — medium, section-colored bottom border (matches webapp)
      case 'h2': {
        checkPageBreak(14)
        y += 5
        const col = h2SectionColor(block.text)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(13)
        const stripped2 = stripInline(block.text)
        const lines = doc.splitTextToSize(stripped2, CW)
        const hl2 = findHighlight(stripped2, highlights)
        if (hl2) {
          const { r, g, b } = parseRgba(hl2.color)
          fill([r, g, b])
          doc.rect(ML - 1, y - 4.5, CW + 2, lines.length * 6.5 + 1.5, 'F')
        }
        rgb(col)
        doc.text(lines, ML, y)
        y += lines.length * 6.5 + 1.5
        stroke(col)
        doc.setLineWidth(0.4)
        doc.line(ML, y, W - MR, y)
        doc.setLineWidth(0.2)
        y += 4
        rgb(P.text)
        break
      }

      // H3 — small semibold, left blue bar (matches webapp pl-3 border-l-2 border-accent/40)
      case 'h3': {
        checkPageBreak(10)
        y += 3
        doc.setFont(FONT, 'bold')
        doc.setFontSize(11)
        const stripped3 = stripInline(block.text)
        const lines = doc.splitTextToSize(stripped3, CW - 5)
        const hl3 = findHighlight(stripped3, highlights)
        if (hl3) {
          const { r, g, b } = parseRgba(hl3.color)
          fill([r, g, b])
          doc.rect(ML + 3, y - 4, CW - 4, lines.length * 5.5 + 1, 'F')
        }
        fill(P.accent)
        doc.rect(ML, y - 3.5, 1.5, lines.length * 5.5 + 0.5, 'F')
        rgb(P.text)
        doc.text(lines, ML + 4, y)
        y += lines.length * 5.5 + 2
        break
      }

      // Paragraph
      case 'paragraph': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        const paraLines = layoutInlineText(block.text, CW, FONT, 10)
        for (const lineSegs of paraLines) {
          checkPageBreak(6)
          const lineText = lineSegs.map(s => s.text).join('')
          const hl = findHighlight(lineText, highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            fill([r, g, b])
            doc.rect(ML - 1, y - 4.5, CW + 2, 5.5, 'F')
          }
          let cx = ML
          for (const s of lineSegs) {
            doc.setFont(s.code ? 'courier' : FONT, s.bold ? 'bold' : s.italic ? 'italic' : 'normal')
            doc.setFontSize(s.code ? 9 : 10)
            rgb(P.textSoft)
            doc.text(s.text, cx, y)
            cx += doc.getTextWidth(s.text)
          }
          doc.setFont(FONT, 'normal')
          doc.setFontSize(10)
          drawRiskBadges(lineText, ML, y)
          y += 5.5
        }
        y += 2
        break
      }

      // Bullet — blue dot, matches webapp's rounded dot
      case 'bullet': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        for (const item of block.items) {
          const itemLines = layoutInlineText(item, CW - 6, FONT, 10)
          checkPageBreak(itemLines.length * 5.5 + 2)

          fill(P.accent)
          doc.circle(ML + 1.8, y - 1.8, 0.9, 'F')

          const hl = findHighlight(stripInline(item), highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            fill([r, g, b])
            doc.rect(ML + 5, y - 4.5, CW - 6, itemLines.length * 5.5 + 0.5, 'F')
          }
          for (const lineSegs of itemLines) {
            let cx = ML + 6
            for (const s of lineSegs) {
              doc.setFont(s.code ? 'courier' : FONT, s.bold ? 'bold' : s.italic ? 'italic' : 'normal')
              doc.setFontSize(s.code ? 9 : 10)
              rgb(P.textSoft)
              doc.text(s.text, cx, y)
              cx += doc.getTextWidth(s.text)
            }
            doc.setFont(FONT, 'normal')
            doc.setFontSize(10)
            y += 5.5
          }
          y += 2
        }
        y += 1
        break
      }

      // Ordered — numbered circles (matches webapp's accent circles)
      case 'ordered': {
        doc.setFont(FONT, 'normal')
        doc.setFontSize(10)
        block.items.forEach((item, idx) => {
          const itemLines = layoutInlineText(item, CW - 9, FONT, 10)
          checkPageBreak(itemLines.length * 5.5 + 2)

          fill(P.accent)
          doc.circle(ML + 2.5, y - 1.5, 2.5, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFont(FONT, 'bold')
          doc.setFontSize(7.5)
          doc.text(`${idx + 1}`, ML + 2.5, y - 0.3, { align: 'center' })

          const hl = findHighlight(stripInline(item), highlights)
          if (hl) {
            const { r, g, b } = parseRgba(hl.color)
            fill([r, g, b])
            doc.rect(ML + 8, y - 4.5, CW - 9, itemLines.length * 5.5 + 0.5, 'F')
          }
          for (const lineSegs of itemLines) {
            let cx = ML + 9
            for (const s of lineSegs) {
              doc.setFont(s.code ? 'courier' : FONT, s.bold ? 'bold' : s.italic ? 'italic' : 'normal')
              doc.setFontSize(s.code ? 9 : 10)
              rgb(P.textSoft)
              doc.text(s.text, cx, y)
              cx += doc.getTextWidth(s.text)
            }
            doc.setFont(FONT, 'normal')
            doc.setFontSize(10)
            y += 5.5
          }
          y += 2
        })
        y += 1
        break
      }

      // Blockquote — left blue bar + light blue bg (matches webapp's border-l-2 bg-accent/0.04)
      case 'blockquote': {
        const text = stripInline(block.text)
        const lines = doc.splitTextToSize(text, CW - 9)
        const bqH = lines.length * 5 + 7
        checkPageBreak(bqH + 2)

        const hlBq = findHighlight(text, highlights)
        if (hlBq) {
          const { r, g, b } = parseRgba(hlBq.color)
          fill([r, g, b])
        } else {
          fill(P.bqBg)
        }
        doc.rect(ML, y - 4, CW, bqH, 'F')
        fill(P.bqBar)
        doc.rect(ML, y - 4, 2, bqH, 'F')

        rgb(P.muted)
        doc.setFont(FONT, 'italic')
        doc.setFontSize(9.5)
        doc.text(lines, ML + 6, y + 0.5)
        y += bqH + 2
        doc.setFont(FONT, 'normal')
        rgb(P.text)
        break
      }

      // Table — dark header, alternating rows, risk cell colouring
      case 'table': {
        const { headers, rows } = block
        const nCols = Math.max(1, headers.length)
        const colW = CW / nCols
        const HPAD = 2.5
        const LINE_H = 4.5
        const CELL_PAD = 2

        // Render a table, possibly spanning pages
        const HDR_ROW_H = 8
        checkPageBreak(HDR_ROW_H + 6)

        // Header row — blue-900 bg, white text
        fill(P.tblHdrBg)
        doc.rect(ML, y, CW, HDR_ROW_H, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont(FONT, 'bold')
        doc.setFontSize(8)
        headers.forEach((h, ci) => {
          const wrapped = doc.splitTextToSize(stripInline(h), colW - HPAD * 2)
          doc.text(wrapped[0] ?? '', ML + ci * colW + HPAD, y + HDR_ROW_H / 2 + 1.5)
        })
        // Column dividers in header
        stroke([255, 255, 255])
        doc.setLineWidth(0.15)
        for (let ci = 1; ci < nCols; ci++) {
          doc.line(ML + ci * colW, y, ML + ci * colW, y + HDR_ROW_H)
        }
        y += HDR_ROW_H

        // Data rows
        rows.forEach((row, ri) => {
          doc.setFont(FONT, 'normal')
          doc.setFontSize(9)

          const cellLines = row.map((cell) =>
            doc.splitTextToSize(stripInline(cell), colW - HPAD * 2)
          )
          const maxLines = Math.max(1, ...cellLines.map((l) => l.length))
          const rowH = maxLines * LINE_H + CELL_PAD * 2

          checkPageBreak(rowH)

          fill(ri % 2 === 0 ? P.tblEvenBg : P.tblOddBg)
          doc.rect(ML, y, CW, rowH, 'F')

          // Per-cell highlight overlay (drawn before text so text sits on top)
          row.forEach((cell, ci) => {
            const hlCell = findHighlight(stripInline(cell), highlights)
            if (hlCell) {
              const { r, g, b } = parseRgba(hlCell.color)
              fill([r, g, b])
              doc.rect(ML + ci * colW, y, colW, rowH, 'F')
            }
          })

          row.forEach((cell, ci) => {
            const lower = cell.toLowerCase()
            if (/high[\s\-]?risk/i.test(lower))                rgb(P.riskHiTx)
            else if (/medium[\s\-]?risk|moderate/i.test(lower)) rgb(P.riskMdTx)
            else if (/low[\s\-]?risk/i.test(lower))             rgb(P.riskLoTx)
            else                                                 rgb(P.textSoft)

            const lines = cellLines[ci]
            lines.forEach((line: string, li: number) => {
              doc.text(line, ML + ci * colW + HPAD, y + CELL_PAD + LINE_H * (li + 0.8))
            })
          })

          // Row border + column dividers
          stroke(P.tblBorder)
          doc.setLineWidth(0.15)
          doc.rect(ML, y, CW, rowH, 'S')
          for (let ci = 1; ci < nCols; ci++) {
            doc.line(ML + ci * colW, y, ML + ci * colW, y + rowH)
          }
          y += rowH
        })

        doc.setLineWidth(0.2)
        rgb(P.text)
        y += 4
        break
      }

      // Horizontal rule
      case 'rule': {
        checkPageBreak(8)
        y += 3
        stroke(P.rule)
        doc.setLineWidth(0.2)
        doc.line(ML, y, W - MR, y)
        y += 5
        break
      }

      // Code block — monospace, light gray bg
      case 'code': {
        const codeLines = block.text.split('\n')
        const lineH = 4.8
        const totalH = codeLines.length * lineH + 8
        checkPageBreak(totalH)

        fill(P.codeBg)
        stroke(P.rule)
        doc.roundedRect(ML, y - 4, CW, totalH, 2, 2, 'FD')

        rgb(P.muted)
        doc.setFont('courier', 'normal')
        doc.setFontSize(8.5)
        for (const cl of codeLines) {
          const wrapped = doc.splitTextToSize(cl, CW - 6)
          doc.text(wrapped, ML + 4, y + 0.5)
          y += wrapped.length * lineH
        }
        y += 8
        doc.setFont(FONT, 'normal')
        rgb(P.text)
        break
      }
    }
  }

  addFooter()
  doc.save(`${filename}.pdf`)
}
