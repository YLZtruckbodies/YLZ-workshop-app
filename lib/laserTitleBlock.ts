export interface TitleBlock {
  description: string
  materialText: string
  sheetThicknessMm: number | null
  sheetLengthMm: number | null
  sheetWidthMm: number | null
}

const RE_MAT_GR    = /(PLATE,\s*STEEL,\s*(?:GR\s*\d+|GRADE\s*\d+),\s*\d+(?:\.\d+)?\s*mm\s*THICK)/i
const RE_MAT_OTHER = /(PLATE,\s*[A-Z]+(?:[A-Z\s,]+)?\d+(?:\.\d+)?\s*mm\s*THICK)/i
const RE_MAT_NONFE = /((?:ALUMIN[IU]?M|STAINLESS|SS)[A-Z, \-0-9]+\d+(?:\.\d+)?\s*mm\s*THICK)/i
const RE_THICK     = /(\d+(?:\.\d+)?)\s*mm\s*THICK/i
const RE_DESC      = /DESCRIPTION ([A-Z0-9 \-/&.,]+?)\s+UNLESS/
const RE_NUM       = /\b(\d+(?:\.\d+)?)\b/g

export function parseTitleBlock(text: string): TitleBlock {
  const flat = text.replace(/\s+/g, ' ').trim()
  const tb: TitleBlock = {
    description: '',
    materialText: '',
    sheetThicknessMm: null,
    sheetLengthMm: null,
    sheetWidthMm: null,
  }

  const descMatch = RE_DESC.exec(flat)
  if (descMatch) tb.description = descMatch[1].trim()

  for (const rx of [RE_MAT_GR, RE_MAT_OTHER, RE_MAT_NONFE]) {
    const m = rx.exec(flat)
    if (m) { tb.materialText = m[1].toUpperCase().trim(); break }
  }

  const src = tb.materialText || flat
  const thickMatch = RE_THICK.exec(src)
  if (thickMatch) tb.sheetThicknessMm = parseFloat(thickMatch[1])

  if (tb.materialText) {
    const idx = flat.toUpperCase().indexOf(tb.materialText)
    const after = idx >= 0 ? flat.slice(idx + tb.materialText.length, idx + tb.materialText.length + 400) : ''
    const nums: number[] = []
    let m: RegExpExecArray | null
    RE_NUM.lastIndex = 0
    while ((m = RE_NUM.exec(after)) !== null) nums.push(parseFloat(m[1]))
    if (nums.length >= 2) {
      tb.sheetLengthMm = nums[0]
      tb.sheetWidthMm  = nums[1]
    }
  }

  return tb
}
