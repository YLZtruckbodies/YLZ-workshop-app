/* eslint-disable @typescript-eslint/no-require-imports */
import type { MOData, MOPart } from './parseMO'

// DrawingMap: part number → JPEG thumbnail Buffer (from Google Drive)
export type DrawingMap = Map<string, Buffer>

// ── Layout constants (A4, points, top-left origin) ────────────────────────────
const A4W   = 595.28
const A4H   = 841.89
const ML    = 36
const MR    = 36
const USABLE = A4W - ML - MR

const CARD_GAP    = 10
const CARD_W      = (USABLE - CARD_GAP) / 2
const CARD_H      = 130
const THUMB_W     = 115
const THUMB_H     = 105
const GROUP_HDR_H = 30
const HEADER_H    = 112

// ── Brand colours ─────────────────────────────────────────────────────────────
const COPPER  = '#7a3a1e'
const BLACK   = '#0a0a0a'
const WHITE   = '#ffffff'
const LGREY   = '#ededed'
const DGREY   = '#595959'
const TEXTBLK = '#141414'
const MGREY   = '#999999'

export async function generateLaserSheet(mo: MOData, drawings: DrawingMap = new Map()): Promise<Buffer> {
  const PDFDocument = require('pdfkit')

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })

  const parts     = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
  const hasFilter = mo.laserParts.length > 0

  // Group by material
  const groups = new Map<string, MOPart[]>()
  for (const part of parts) {
    const key = part.material || 'Unknown Material'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(part)
  }

  const chunks: Buffer[] = []
  doc.on('data', (b: Buffer) => chunks.push(b))

  let curY      = 0
  let firstPage = true

  const newPage = () => {
    if (!firstPage) doc.addPage({ size: 'A4', margin: 0 })
    firstPage = false
    drawHeader(doc, mo, hasFilter)
    curY = HEADER_H
  }

  const ensureSpace = (h: number) => {
    if (curY + h > A4H - 40) newPage()
  }

  newPage()

  for (const [material, mParts] of Array.from(groups)) {
    ensureSpace(GROUP_HDR_H + CARD_H + 10)
    drawGroupHeader(doc, material, curY)
    curY += GROUP_HDR_H + 6

    for (let i = 0; i < mParts.length; i += 2) {
      ensureSpace(CARD_H + 10)
      drawCard(doc, mParts[i],        ML,              curY, drawings)
      if (mParts[i + 1]) {
        drawCard(doc, mParts[i + 1],  ML + CARD_W + CARD_GAP, curY, drawings)
      }
      curY += CARD_H + 8
    }
    curY += 10
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(doc: any, mo: MOData, filtered: boolean) {
  doc.rect(0, 0, A4W, 62).fill(BLACK)
  doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE)
    .text('COLD FORM',      ML, 18, { lineBreak: false })
  doc.font('Helvetica').fontSize(8.5).fillColor('#a6a6a6')
    .text('LASER CUT PACK', ML, 36, { lineBreak: false })

  doc.rect(0, 62, A4W, 3).fill(COPPER)

  const dy  = 72
  const col = [ML, 185, 330, 430]

  labelVal(doc, col[0], dy, 'MO NUMBER', mo.moNumber,              13)
  labelVal(doc, col[1], dy, 'PRODUCT',   truncate(mo.product, 26), 8.5)
  labelVal(doc, col[2], dy, 'DATE',      mo.date,                  10)
  labelVal(doc, col[3], dy, 'QTY',       mo.quantity,              10)

  if (filtered) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COPPER)
      .text('LASER CUT PARTS ONLY', col[1], dy + 30, { lineBreak: false })
  }

  doc.moveTo(ML, 108).lineTo(A4W - MR, 108).lineWidth(0.75).stroke(COPPER)
}

// ── Group header ──────────────────────────────────────────────────────────────
function drawGroupHeader(doc: any, material: string, y: number) {
  doc.rect(ML, y, USABLE, GROUP_HDR_H).fill(BLACK)
  doc.rect(ML, y, 3, GROUP_HDR_H).fill(COPPER)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE)
    .text(material.toUpperCase(), ML + 10, y + 10, { lineBreak: false })
}

// ── Card ──────────────────────────────────────────────────────────────────────
function drawCard(doc: any, part: MOPart, x: number, y: number, drawings: DrawingMap) {
  // Background + border
  doc.rect(x, y, CARD_W, CARD_H).fill(LGREY)
  doc.rect(x, y, CARD_W, CARD_H).lineWidth(0.75).stroke('#c8c8c8')

  // Copper top accent
  doc.rect(x, y, CARD_W, 3).fill(COPPER)

  const PAD    = 8
  const thumbX = x + PAD
  const thumbY = y + PAD + 3

  // Thumbnail
  const img = drawings.get(part.partNumber)
  if (img) {
    try {
      doc.image(img, thumbX, thumbY, {
        fit:    [THUMB_W, THUMB_H],
        align:  'center',
        valign: 'center',
      })
    } catch {
      drawPlaceholder(doc, thumbX, thumbY)
    }
  } else {
    drawPlaceholder(doc, thumbX, thumbY)
  }

  // Thumbnail border
  doc.rect(thumbX, thumbY, THUMB_W, THUMB_H).lineWidth(0.5).stroke('#b3b3b3')

  // Part details (right of thumbnail)
  const detailX = thumbX + THUMB_W + PAD
  const detailW = CARD_W - THUMB_W - PAD * 3
  const detailY = y + PAD + 4

  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXTBLK)
    .text(part.partNumber, detailX, detailY, { lineBreak: false })
  doc.font('Helvetica').fontSize(8).fillColor(DGREY)
    .text(truncate(part.description, 22), detailX, detailY + 16, { lineBreak: false })

  // Qty badge
  doc.rect(detailX, detailY + 34, detailW, 18).fill(BLACK)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE)
    .text(`QTY  ${part.quantity.replace(' EACH', '')}`, detailX + 4, detailY + 39, { lineBreak: false })

  // Thickness callout
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COPPER)
    .text(part.thickness.toUpperCase(), detailX, detailY + 62, { lineBreak: false })
  doc.font('Helvetica').fontSize(6.5).fillColor(MGREY)
    .text('THICK', detailX, detailY + 83, { lineBreak: false })
}

// ── Thumbnail placeholder ─────────────────────────────────────────────────────
function drawPlaceholder(doc: any, x: number, y: number) {
  doc.rect(x, y, THUMB_W, THUMB_H).fill('#e0e0e0')
  doc.moveTo(x, y).lineTo(x + THUMB_W, y + THUMB_H).lineWidth(0.5).stroke('#bfbfbf')
  doc.moveTo(x + THUMB_W, y).lineTo(x, y + THUMB_H).lineWidth(0.5).stroke('#bfbfbf')
  doc.font('Helvetica').fontSize(7).fillColor('#8c8c8c')
    .text('No drawing', x + 4, y + THUMB_H - 14, { lineBreak: false })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function labelVal(doc: any, x: number, y: number, label: string, value: string, size: number) {
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(MGREY)
    .text(label, x, y, { lineBreak: false })
  doc.font('Helvetica-Bold').fontSize(size).fillColor(TEXTBLK)
    .text(value, x, y + 14, { lineBreak: false })
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
