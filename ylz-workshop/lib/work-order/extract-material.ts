/**
 * PDF material extraction — ported from work_order_generator.py
 *
 * Extracts material type, thickness, and flat pattern info from
 * engineering drawing PDF text content.
 */

export interface PdfPartInfo {
  material: string       // e.g. "Hardox 500 - 6mm"
  thickness: string      // e.g. "6mm"
  hasFlatPattern: boolean
  quantity: number        // e.g. 4 — extracted from title block or BOM
}

// Regex patterns to find material references in PDF text (order matters — first match wins)
const MATERIAL_PATTERNS: RegExp[] = [
  /hardox\s*\d+\s*[-–]?\s*[\d.]+\s*mm/i,
  /hardox\s*\d+\s+[\d.]+\s*(?:mm)?/i,
  /mild\s*steel\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /ms\s*(?:gr?\.?\s*)?(?:\d+)?\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /(?:AS\s*)?(?:\d{4})?\s*(?:gr(?:ade)?\.?\s*)?350\s*(?:HR)?\s*[-–]?\s*[\d.]+\s*mm/i,
  /material\s*[:=]\s*([^\n]{5,60})/i,
  /[\d.]+\s*mm\s*(?:thick|thk|THK)?/i,
]

// Normalise common material name variations
const MATERIAL_NORMALISE: Record<string, string> = {
  'mild steel 350 hr': 'Mild Steel 350 HR',
  'mild steel gr350': 'Mild Steel 350 HR',
  'mild steel grade 350': 'Mild Steel 350 HR',
  'ms 350': 'Mild Steel 350 HR',
  'ms gr350': 'Mild Steel 350 HR',
  'hardox 500': 'Hardox 500',
  'hardox 450': 'Hardox 450',
  'hardox 400': 'Hardox 400',
}

// Regex patterns to find quantity in engineering drawing title blocks
const QUANTITY_PATTERNS: RegExp[] = [
  /\bQTY\s*[:=]?\s*(\d+)/i,              // QTY: 4, QTY 4, QTY=4
  /\bQUANTITY\s*[:=]?\s*(\d+)/i,         // QUANTITY: 4
  /\bQ'?TY\s*[:=]?\s*(\d+)/i,            // Q'TY: 4
  /\bNO\.?\s*(?:OFF|REQ'?D?)\s*[:=]?\s*(\d+)/i,  // NO. OFF: 4, NO REQ'D: 4
  /\b(\d+)\s*(?:OFF|REQ'?D)\b/i,         // 4 OFF, 4 REQ'D
  /\bREQ(?:UIRED)?\s*[:=]?\s*(\d+)/i,    // REQ: 4, REQUIRED: 4
]

export function extractMaterialFromText(text: string): PdfPartInfo {
  const info: PdfPartInfo = { material: 'Unknown', thickness: '', hasFlatPattern: false, quantity: 0 }

  // Flat pattern detection
  if (/flat\s*pattern/i.test(text)) {
    info.hasFlatPattern = true
  }

  // Find material reference
  let materialFound: string | null = null
  for (const pattern of MATERIAL_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      // Pattern 6 (material: X) uses capture group 1; others use full match
      materialFound = (match[1] || match[0]).trim()
      break
    }
  }

  // Extract quantity from title block
  for (const qp of QUANTITY_PATTERNS) {
    const qMatch = text.match(qp)
    if (qMatch) {
      const qty = parseInt(qMatch[1], 10)
      if (qty > 0 && qty < 1000) {  // sanity check
        info.quantity = qty
        break
      }
    }
  }

  if (!materialFound) return info

  // Extract thickness
  const thicknessMatch = materialFound.match(/([\d.]+)\s*mm/)
  const thickness = thicknessMatch ? `${thicknessMatch[1]}mm` : ''
  info.thickness = thickness

  // Remove thickness from material string for normalisation lookup
  let matClean = materialFound.replace(/[\d.]+\s*mm/, '').trim()
  matClean = matClean.replace(/\s*[-–]\s*$/, '').trim()
  const matLower = matClean.toLowerCase()

  // Try to normalise
  let normalised: string | null = null
  for (const [key, val] of Object.entries(MATERIAL_NORMALISE)) {
    if (matLower.includes(key)) {
      normalised = val
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
