/**
 * PDF material extraction for YLZ engineering drawings.
 *
 * Two modes:
 * 1. extractMaterialFromText() — reads an individual part PDF title block
 * 2. extractBomEntries()       — reads a SolidWorks BOM table from an assembly
 *    drawing (_BW.pdf / _BF.pdf), returning qty + material + thickness per part.
 *
 * Position-sorted pdfjs text (see extractPdfText.ts) gives reading order that
 * matches pdfplumber, so SolidWorks title-block fields arrive in the correct
 * sequence rather than PDF-draw order.
 */

export interface PdfPartInfo {
  material: string
  thickness: string
  hasFlatPattern: boolean
}

export interface BomEntry {
  qty: number
  material: string
  thickness: string
  hasFlatPattern: boolean
}

// ── Material patterns (order matters — first match wins) ───────────────────
const MATERIAL_PATTERNS: RegExp[] = [
  // Hardox
  /hardox\s*\d+\s*[-–]?\s*[\d.]+\s*mm/i,
  /hardox\s*\d+\s+[\d.]+\s*(?:mm)?/i,
  // Stainless steel
  /stainless\s*steel\s*(?:gr?\.?\s*)?(?:304|316[lL]?|430|201)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bss\s*(?:304|316[lL]?|430|201)\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bss\s*(?:304|316[lL]?|430|201)\b/i,
  // Aluminium — comma-separated SolidWorks description format
  // e.g. "PLATE, ALUMINIUM, 5083, 8.0mm THICK"
  /alumin(?:ium|um)[,\s]+\d{4}[,\s]+[\d.]+\s*mm/i,
  /alumin(?:ium|um)[,\s]+[\d.]+\s*mm/i,
  // Aluminium — explicit keyword with whitespace/dash separators
  /alumin(?:ium|um)\s*(?:\d{4})?\s*(?:-?[tThH]\d+)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bal(?:um)?\s*(?:\d{4})\s*(?:-?[tThH]\d+)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bal\s*[-–]?\s*[\d.]+\s*mm/i,
  // Aluminium alloy series (5xxx / 6xxx) with temper + thickness — e.g. "5083-H321 - 3mm"
  /\b[56]\d{3}\s*[-–]\s*[HhTt]\d+\s*[-–]?\s*[\d.]+\s*mm/i,
  // Aluminium alloy series with thickness but no temper — e.g. "5083 - 3mm"
  /\b[56]\d{3}\s*[-–]\s*[\d.]+\s*mm/i,
  // Mild steel
  /mild\s*steel\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /ms\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /(?:AS\s*)?(?:\d{4})?\s*(?:gr(?:ade)?\.?\s*)?350\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  // Generic title-block "Material: X"
  /material\s*[:=]\s*([^\n]{5,60})/i,
  // Fallback thickness
  /[\d.]+\s*mm\s*(?:thick|thk|THK)?/i,
]

// Normalise to canonical material names
const MATERIAL_NORMALISE: [RegExp, string][] = [
  [/hardox\s*500/i,             'Hardox 500'],
  [/hardox\s*450/i,             'Hardox 450'],
  [/hardox\s*400/i,             'Hardox 400'],
  [/stainless\s*steel\s*316l/i, 'Stainless Steel 316L'],
  [/stainless\s*steel\s*316/i,  'Stainless Steel 316'],
  [/stainless\s*steel\s*304/i,  'Stainless Steel 304'],
  [/stainless\s*steel\s*430/i,  'Stainless Steel 430'],
  [/stainless\s*steel/i,        'Stainless Steel'],
  [/ss\s*316l/i,                'Stainless Steel 316L'],
  [/ss\s*316/i,                 'Stainless Steel 316'],
  [/ss\s*304/i,                 'Stainless Steel 304'],
  [/ss\s*430/i,                 'Stainless Steel 430'],
  [/alumin(?:ium|um)\s*5083/i,  'Aluminium 5083'],
  [/alumin(?:ium|um)\s*6061/i,  'Aluminium 6061'],
  [/alumin(?:ium|um)\s*6082/i,  'Aluminium 6082'],
  [/alumin(?:ium|um)/i,         'Aluminium'],
  [/al\s*5083/i,                'Aluminium 5083'],
  [/al\s*6061/i,                'Aluminium 6061'],
  [/al\s*6082/i,                'Aluminium 6082'],
  // Bare alloy codes (5xxx/6xxx series) — used in SolidWorks title blocks without "Aluminium" prefix
  [/\b5083\b/i,                 'Aluminium 5083'],
  [/\b5052\b/i,                 'Aluminium 5052'],
  [/\b5005\b/i,                 'Aluminium 5005'],
  [/\b6061\b/i,                 'Aluminium 6061'],
  [/\b6082\b/i,                 'Aluminium 6082'],
  [/\b6063\b/i,                 'Aluminium 6063'],
  [/mild\s*steel\s*(?:gr(?:ade)?\s*)?350\s*hr/i, 'Mild Steel 350 HR'],
  [/mild\s*steel\s*(?:gr(?:ade)?\s*)?350/i,       'Mild Steel 350 HR'],
  [/mild\s*steel/i,             'Mild Steel 350 HR'],
  [/ms\s*gr(?:ade)?\s*350/i,    'Mild Steel 350 HR'],
  [/ms\s*350/i,                 'Mild Steel 350 HR'],
  [/\bms\b/i,                   'Mild Steel 350 HR'],
  [/\b350\s*hr\b/i,             'Mild Steel 350 HR'],
]

function parseMaterial(text: string): { material: string; thickness: string } {
  // Run patterns on both original and newline-collapsed text (SolidWorks title
  // blocks sometimes split "Hardox\n500\n-\n6mm" across separate lines)
  const collapsed = text.replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ')

  let materialFound: string | null = null
  for (const searchText of [text, collapsed]) {
    for (const pattern of MATERIAL_PATTERNS) {
      const match = searchText.match(pattern)
      if (match) {
        materialFound = (match[1] || match[0]).trim()
        break
      }
    }
    if (materialFound) break
  }

  if (!materialFound) return { material: 'Unknown', thickness: '' }

  const thicknessMatch = materialFound.match(/([\d.]+)\s*mm/)
  const thickness = thicknessMatch ? `${thicknessMatch[1]}mm` : ''

  let matClean = materialFound.replace(/[\d.]+\s*mm/, '').replace(/\s*[-–]\s*$/, '').trim()
  // Normalise comma separators to spaces so patterns like /aluminium\s*5083/ match
  // comma-separated formats like "PLATE, ALUMINIUM, 5083, THICK"
  const matCleanNorm = matClean.replace(/[,\s]+/g, ' ').trim()
  let normalised: string | null = null
  for (const [pat, canonical] of MATERIAL_NORMALISE) {
    if (pat.test(matCleanNorm) || pat.test(matClean)) { normalised = canonical; break }
  }

  const material = normalised
    ? (thickness ? `${normalised} - ${thickness}` : normalised)
    : materialFound.replace(/\s+/g, ' ').trim()

  return { material, thickness }
}

export function extractMaterialFromText(text: string): PdfPartInfo {
  const { material, thickness } = parseMaterial(text)
  return {
    material,
    thickness,
    hasFlatPattern: /flat\s*pattern/i.test(text),
  }
}

// ── BOM table extraction ───────────────────────────────────────────────────

/**
 * Parse a SolidWorks BOM table from an assembly drawing PDF (e.g. _BW.pdf).
 *
 * After position-sorted pdfjs extraction, a typical row looks like:
 *   "1 2 100-05-001 BODY WALL SIDE LH Hardox 500 - 6mm"
 *
 * Returns a map of partNumber → {qty, material, thickness, hasFlatPattern}.
 * Material is extracted from the row text using the same patterns as above.
 * qty from multiple BOM files (BW + BF) are summed by the caller.
 */
export function extractBomEntries(text: string): Map<string, BomEntry> {
  const entryMap = new Map<string, BomEntry>()
  const globalFlatPattern = /flat\s*pattern/i.test(text)

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Part-number pattern: NNN-NN-NNNN with optional single-letter revision
    const pnMatch = trimmed.match(/\b((\d{2,3}-\d{2}-\d{3,4})[A-Za-z]?)\b/)
    if (!pnMatch) continue
    const pn = pnMatch[2].toUpperCase() // base PN, no revision

    // ── Qty ────────────────────────────────────────────────────────────────
    // Strategy 1: "ITEM  QTY  PARTNUMBER ..." (SolidWorks default column order)
    const primary = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+((\d{2,3}-\d{2}-\d{3,4})[A-Za-z]?)[\s\t]/)
    let qty = 1
    if (primary) {
      qty = parseInt(primary[2], 10)
    } else {
      // Strategy 2: find small integers on the line excluding the part-number digits
      const lineNoPn = trimmed.replace(pnMatch[1], '')
      const nums = [...lineNoPn.matchAll(/\b(\d{1,3})\b/g)]
        .map(m => parseInt(m[1], 10))
        .filter(n => n > 0 && n < 500)
      if (nums.length >= 2) qty = nums[1]
      else if (nums.length === 1) qty = nums[0]
    }

    // ── Material ───────────────────────────────────────────────────────────
    const { material, thickness } = parseMaterial(trimmed)

    entryMap.set(pn, {
      qty: qty > 0 && qty < 500 ? qty : 1,
      material,
      thickness,
      hasFlatPattern: globalFlatPattern,
    })
  }

  return entryMap
}
