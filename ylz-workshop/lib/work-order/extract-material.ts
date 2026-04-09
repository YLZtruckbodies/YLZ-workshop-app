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
      // Pattern 6 (material: X) uses capture group 1; others use full match
      materialFound = (match[1] || match[0]).trim()
      break
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
