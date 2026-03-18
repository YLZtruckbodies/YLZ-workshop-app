// Use require() inline so Next.js/webpack does not statically bundle pdf-lib
/* eslint-disable @typescript-eslint/no-require-imports */

import type { MOData, MOPart } from './parseMO'

export type DrawingMap = Map<string, Uint8Array>

// ── Constants ─────────────────────────────────────────────────────────────────
const A4W    = 595.28
const A4H    = 841.89
const ML     = 36
const MR     = 36
const USABLE = A4W - ML - MR

const CARD_GAP = 10
const CARD_W   = (USABLE - CARD_GAP) / 2
const CARD_H   = 130
const THUMB_W  = 115
const THUMB_H  = 105
const GROUP_HDR_H = 32
const HEADER_H    = 170

export async function generateLaserSheet(mo: MOData, drawings: DrawingMap = new Map()): Promise<Uint8Array> {
  // Lazy require — keeps pdf-lib out of the webpack bundle
  const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')

  // Colours
  const COPPER  = rgb(0.478, 0.227, 0.118)
  const BLACK   = rgb(0.039, 0.039, 0.039)
  const WHITE   = rgb(1, 1, 1)
  const LGREY   = rgb(0.93, 0.93, 0.93)
  const DGREY   = rgb(0.35, 0.35, 0.35)
  const TEXTBLK = rgb(0.08, 0.08, 0.08)
  const MGREY   = rgb(0.6, 0.6, 0.6)

  const doc  = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg  = await doc.embedFont(StandardFonts.Helvetica)

  const parts     = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
  const hasFilter = mo.laserParts.length > 0

  // Group parts by material
  const groups = new Map<string, MOPart[]>()
  for (const part of parts) {
    const key = part.material || 'Unknown Material'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(part)
  }

  let curPage: any = null
  let curY = 0

  const newPage = () => {
    const p = doc.addPage([A4W, A4H])
    drawPageHeader(p, bold, reg, mo, hasFilter, rgb, COPPER, BLACK, WHITE, MGREY, TEXTBLK)
    curY = A4H - HEADER_H
    curPage = p
  }

  const ensureSpace = (needed: number) => {
    if (!curPage || curY - needed < 50) newPage()
  }

  newPage()

  for (const [material, mParts] of Array.from(groups)) {
    ensureSpace(GROUP_HDR_H + CARD_H + 10)
    drawGroupHeader(curPage, bold, material, curY, BLACK, WHITE, COPPER)
    curY -= GROUP_HDR_H + 6

    for (let i = 0; i < mParts.length; i += 2) {
      ensureSpace(CARD_H + 10)
      const leftPart  = mParts[i]
      const rightPart = mParts[i + 1] ?? null

      await drawCard(doc, curPage, bold, reg, leftPart,  ML,              curY, drawings, rgb, COPPER, BLACK, WHITE, LGREY, DGREY, TEXTBLK, MGREY)
      if (rightPart) {
        await drawCard(doc, curPage, bold, reg, rightPart, ML + CARD_W + CARD_GAP, curY, drawings, rgb, COPPER, BLACK, WHITE, LGREY, DGREY, TEXTBLK, MGREY)
      }
      curY -= CARD_H + 8
    }
    curY -= 10
  }

  // Page numbers
  const total = doc.getPageCount()
  if (total > 1) {
    const pages = doc.getPages()
    for (let i = 0; i < pages.length; i++) {
      pages[i].drawText(`${i + 1} / ${total}`, {
        x: A4W - MR - 30, y: A4H - 18, size: 7.5, font: reg, color: MGREY,
      })
    }
  }

  return doc.save()
}

function drawPageHeader(page: any, bold: any, reg: any, mo: MOData, filtered: boolean, rgb: any, COPPER: any, BLACK: any, WHITE: any, MGREY: any, TEXTBLK: any) {
  page.drawRectangle({ x: 0, y: A4H - 62, width: A4W, height: 62, color: BLACK })
  page.drawText('COLD FORM',      { x: ML, y: A4H - 24, size: 16,  font: bold, color: WHITE })
  page.drawText('LASER CUT PACK', { x: ML, y: A4H - 40, size: 8.5, font: reg,  color: rgb(0.65, 0.65, 0.65) })
  page.drawRectangle({ x: 0, y: A4H - 65, width: A4W, height: 3, color: COPPER })

  const dy  = A4H - 90
  const col = [ML, 185, 330, 430]

  labelVal(page, bold, reg, col[0], dy, 'MO NUMBER', mo.moNumber, 13,  MGREY, TEXTBLK)
  labelVal(page, bold, reg, col[1], dy, 'PRODUCT',   truncate(mo.product, 26), 8.5, MGREY, TEXTBLK)
  labelVal(page, bold, reg, col[2], dy, 'DATE',      mo.date,     10, MGREY, TEXTBLK)
  labelVal(page, bold, reg, col[3], dy, 'QTY',       mo.quantity, 10, MGREY, TEXTBLK)

  if (filtered) {
    page.drawText('LASER CUT PARTS ONLY', { x: col[1], y: dy - 28, size: 7, font: bold, color: COPPER })
  }

  page.drawLine({
    start: { x: ML, y: dy - 36 },
    end:   { x: A4W - MR, y: dy - 36 },
    thickness: 0.75, color: COPPER,
  })
}

function drawGroupHeader(page: any, bold: any, material: string, y: number, BLACK: any, WHITE: any, COPPER: any) {
  page.drawRectangle({ x: ML, y: y - GROUP_HDR_H + 8, width: USABLE, height: GROUP_HDR_H - 2, color: BLACK })
  page.drawRectangle({ x: ML, y: y - GROUP_HDR_H + 6, width: 3,      height: GROUP_HDR_H - 2, color: COPPER })
  page.drawText(material.toUpperCase(), { x: ML + 10, y: y - 16, size: 9, font: bold, color: WHITE })
}

async function drawCard(
  doc: any, page: any, bold: any, reg: any,
  part: MOPart, x: number, y: number, drawings: DrawingMap,
  rgb: any, COPPER: any, BLACK: any, WHITE: any, LGREY: any, DGREY: any, TEXTBLK: any, MGREY: any,
) {
  const cardBottom = y - CARD_H

  page.drawRectangle({ x, y: cardBottom, width: CARD_W, height: CARD_H, color: LGREY })
  page.drawRectangle({ x, y: cardBottom, width: CARD_W, height: CARD_H, borderColor: rgb(0.78, 0.78, 0.78), borderWidth: 0.75 })
  page.drawRectangle({ x, y: y - 3, width: CARD_W, height: 3, color: COPPER })

  const PAD    = 8
  const thumbX = x + PAD
  const thumbY = y - PAD - THUMB_H

  const drawingBytes = drawings.get(part.partNumber)
  if (drawingBytes) {
    try {
      const embedded = await doc.embedPdf(drawingBytes, [0])
      const ep    = embedded[0]
      const scale = Math.min(THUMB_W / ep.width, THUMB_H / ep.height)
      const tw    = ep.width  * scale
      const th    = ep.height * scale
      const tx    = thumbX + (THUMB_W - tw) / 2
      const ty    = thumbY + (THUMB_H - th) / 2
      page.drawPage(ep, { x: tx, y: ty, width: tw, height: th })
    } catch {
      drawThumbPlaceholder(page, reg, thumbX, thumbY, THUMB_W, THUMB_H, 'Drawing error', rgb)
    }
  } else {
    drawThumbPlaceholder(page, reg, thumbX, thumbY, THUMB_W, THUMB_H, 'No drawing', rgb)
  }

  page.drawRectangle({ x: thumbX, y: thumbY, width: THUMB_W, height: THUMB_H, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 })

  const detailX = thumbX + THUMB_W + PAD
  const detailW = CARD_W - THUMB_W - PAD * 3
  const detailY = y - PAD - 4

  page.drawText(part.partNumber,           { x: detailX, y: detailY,      size: 10,  font: bold, color: TEXTBLK })
  page.drawText(truncate(part.description, 22), { x: detailX, y: detailY - 16, size: 8, font: reg,  color: DGREY })

  page.drawRectangle({ x: detailX, y: detailY - 42, width: detailW, height: 18, color: BLACK })
  page.drawText(`QTY  ${part.quantity.replace(' EACH', '')}`, { x: detailX + 4, y: detailY - 35, size: 8.5, font: bold, color: WHITE })

  page.drawText(part.thickness.toUpperCase(), { x: detailX, y: detailY - 66, size: 18,  font: bold, color: COPPER })
  page.drawText('THICK',                      { x: detailX, y: detailY - 80, size: 6.5, font: reg,  color: MGREY })
}

function drawThumbPlaceholder(page: any, reg: any, x: number, y: number, w: number, h: number, msg: string, rgb: any) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.88, 0.88, 0.88) })
  page.drawLine({ start: { x, y }, end: { x: x + w, y: y + h }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) })
  page.drawLine({ start: { x: x + w, y }, end: { x, y: y + h }, thickness: 0.5, color: rgb(0.75, 0.75, 0.75) })
  page.drawText(msg, { x: x + 4, y: y + 6, size: 6, font: reg, color: rgb(0.55, 0.55, 0.55) })
}

function labelVal(page: any, bold: any, reg: any, x: number, y: number, label: string, value: string, size: number, MGREY: any, TEXTBLK: any) {
  page.drawText(label, { x, y: y + 2,  size: 6.5, font: bold, color: MGREY })
  page.drawText(value, { x, y: y - 12, size,      font: bold, color: TEXTBLK })
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '...' : s
}
