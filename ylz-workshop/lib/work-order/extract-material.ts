/**
 * PDF material extraction — ported from work_order_generator.py
 *
 * Extracts material type, thickness, and flat pattern info from
 * engineering drawing PDF text content.
 *
 * Also parses BOM tables from assembly drawings (_BW.pdf / _BF.pdf)
 * to extract part quantities.
 */

export interface PdfPartInfo {
  material: string       // e.g. "Hardox 500 - 6mm"
  thickness: string      // e.g. "6mm"
  hasFlatPattern: boolean
}

// Regex patterns to find material references in PDF text (order matters — first match wins)
const MATERIAL_PATTERNS: RegExp[] = [
  // Hardox
  /hardox\s*\d+\s*[-–]?\s*[\d.]+\s*mm/i,
  /hardox\s*\d+\s+[\d.]+\s*(?:mm)?/i,
  // Stainless steel — 304, 316, 316L, 430, etc.
  /stainless\s*steel\s*(?:gr?\.?\s*)?(?:304|316[lL]?|430|201)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bss\s*(?:304|316[lL]?|430|201)\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bss\s*(?:304|316[lL]?|430|201)\b/i,
  // Aluminium — 5083, 6061, 6082, etc. with optional temper
  /alumin(?:ium|um)\s*(?:\d{4})?\s*(?:-?[tThH]\d+)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bal(?:um)?\s*(?:\d{4})\s*(?:-?[tThH]\d+)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /\bal\s*[-–]?\s*[\d.]+\s*mm/i,
  // Mild steel
  /mild\s*steel\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /ms\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /(?:AS\s*)?(?:\d{4})?\s*(?:gr(?:ade)?\.?\s*)?350\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  // Generic "Material: X" title block cell
  /material\s*[:=]\s*([^\n]{5,60})/i,
  // Fallback: any thickness
  /[\d.]+\s*mm\s*(?:thick|thk|THK)?/i,
]

// Normalise common material name variations to canonical form
const MATERIAL_NORMALISE: [RegExp, string][] = [
  [/hardox\s*500/i,           'Hardox 500'],
  [/hardox\s*450/i,           'Hardox 450'],
  [/hardox\s*400/i,           'Hardox 400'],
  [/stainless\s*steel\s*316l/i,'Stainless Steel 316L'],
  [/stainless\s*steel\s*316/i, 'Stainless Steel 316'],
  [/stainless\s*steel\s*304/i, 'Stainless Steel 304'],
  [/stainless\s*steel\s*430/i, 'Stainless Steel 430'],
  [/stainless\s*steel/i,       'Stainless Steel'],
  [/ss\s*316l/i,               'Stainless Steel 316L'],
  [/ss\s*316/i,                'Stainless Steel 316'],
  [/ss\s*304/i,                'Stainless Steel 304'],
  [/ss\s*430/i,                'Stainless Steel 430'],
  [/alumin(?:ium|um)\s*5083/i, 'Aluminium 5083'],
  [/alumin(?:ium|um)\s*6061/i, 'Aluminium 6061'],
  [/alumin(?:ium|um)\s*6082/i, 'Aluminium 6082'],
  [/alumin(?:ium|um)/i,        'Aluminium'],
  [/al\s*5083/i,               'Aluminium 5083'],
  [/al\s*6061/i,               'Aluminium 6061'],
  [/al\s*6082/i,               'Aluminium 6082'],
  [/mild\s*steel\s*(?:gr(?:ade)?\s*)?350\s*hr/i, 'Mild Steel 350 HR'],
  [/mild\s*steel\s*(?:gr(?:ade)?\s*)?350/i,       'Mild Steel 350 HR'],
  [/mild\s*steel/i,            'Mild Steel 350 HR'],
  [/ms\s*gr(?:ade)?\s*350/i,   'Mild Steel 350 HR'],
  [/ms\s*350/i,                'Mild Steel 350 HR'],
  [/\bms\b/i,                  'Mild Steel 350 HR'],
  [/\b350\s*hr\b/i,            'Mild Steel 350 HR'],
]

export function extractMaterialFromText(text: string): PdfPartInfo {
  const info: PdfPartInfo = { material: 'Unknown', thickness: '', hasFlatPattern: false }

  // Flat pattern detection
  if (/flat\s*pattern/i.test(text)) {
    info.hasFlatPattern = true
  }

  // Find material reference
  let materialFound: string | null = null
  for (const pattern of MATERIAL_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      // Pattern with capture group (material: X) uses group 1; others use full match
      materialFound = (match[1] || match[0]).trim()
      break
    }
  }

  if (!materialFound) return info

  // Extract thickness
  const thicknessMatch = materialFound.match(/([\d.]+)\s*mm/)
  const thickness = thicknessMatch ? `${thicknessMatch[1]}mm` : ''
  info.thickness = thickness

  // Remove thickness from material string for normalisation
  let matClean = materialFound.replace(/[\d.]+\s*mm/, '').replace(/\s*[-–]\s*$/, '').trim()

  // Try normalise using regex keys
  let normalised: string | null = null
  for (const [pattern, canonical] of MATERIAL_NORMALISE) {
    if (pattern.test(matClean)) {
      normalised = canonical
      break
    }
  }

  if (normalised) {
    info.material = thickness ? `${normalised} - ${thickness}` : normalised
  } else {
    info.material = materialFound.replace(/\s+/g, ' ').trim()
  }

  return info
}

// ── BOM quantity extraction ────────────────────────────────────────────────────

/**
 * Parse a SolidWorks BOM table from assembly drawing PDF text.
 * Returns a map of partNumber (UPPERCASE, no extension/revision) → quantity.
 *
 * Handles the standard SolidWorks BOM layout:
 *   ITEM  QTY  PART NUMBER  DESCRIPTION  MATERIAL
 *   1     2    100-05-001   SIDE PANEL   Hardox 500 6mm
 */
export function extractBomQuantities(text: string): Map<string, number> {
  const qtyMap = new Map<string, number>()

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Strategy 1 — SolidWorks default column order: ITEM  QTY  PARTNUMBER ...
    // item (1-3 digits) + qty (1-3 digits) + part number (e.g. 100-05-001 or 100-05-001A)
    const primary = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+((\d{2,3}-\d{2}-\d{3,4})[A-Za-z]?)[\s\t]/)
    if (primary) {
      const qty = parseInt(primary[2], 10)
      const pn = primary[4].toUpperCase() // base PN without revision letter
      if (qty > 0 && qty < 500) {
        qtyMap.set(pn, (qtyMap.get(pn) || 0) + qty)
      }
      continue
    }

    // Strategy 2 — Part number anywhere on line, look for nearby qty
    const pnMatch = trimmed.match(/\b((\d{2,3}-\d{2}-\d{3,4})[A-Za-z]?)\b/)
    if (!pnMatch) continue
    const pn = pnMatch[2].toUpperCase()
    if (qtyMap.has(pn)) continue // already found via strategy 1

    // Collect all small integers on this line (exclude the part-number digits)
    const lineNoPn = trimmed.replace(pnMatch[1], '')
    const nums = [...lineNoPn.matchAll(/\b(\d{1,3})\b/g)]
      .map(m => parseInt(m[1], 10))
      .filter(n => n > 0 && n < 500)

    if (nums.length >= 2) {
      // "ITEM  QTY  ..." — second number is qty
      qtyMap.set(pn, nums[1])
    } else if (nums.length === 1) {
      qtyMap.set(pn, nums[0])
    }
  }

  return qtyMap
}
