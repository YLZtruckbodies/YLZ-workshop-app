// Material code mapping (MRPeasy group 880 STEEL plates)
// Confirm with Joel before using for anything other than GR700 8mm.

export const MATERIAL_TABLE: Record<number, Record<number, string>> = {
  700: {
    3: '880-01-056',
    4: '880-01-058',
    5: '880-01-060',
    6: '880-01-062',
    8: '880-01-064',
    10: '880-01-066',
    12: '880-01-068',
    16: '880-01-070',
  },
  350: {
    5: '880-01-050',
    8: '880-01-054',
  },
  250: {
    3: '880-01-026',
    4: '880-01-028',
    5: '880-01-030',
    6: '880-01-032',
    8: '880-01-034',
    10: '880-01-036',
    12: '880-01-038',
    16: '880-01-040',
  },
}

// Cut feed-rate placeholders, mm/min, by thickness.
// 8mm is confirmed (6,200 mm/min). All others are placeholders Joel needs to confirm.
export const FEED_RATES_MM_MIN: Record<number, number> = {
  3: 12000,
  4: 10000,
  5: 8500,
  6: 7400,
  8: 6200,
  10: 4800,
  12: 3600,
  16: 2400,
}

export function mapMaterialCode(materialText: string, thicknessMm: number | null): string {
  if (!materialText || thicknessMm === null) return ''
  const s = materialText.toUpperCase()

  if (s.includes('ALUMIN')) return '880-02-001'        // placeholder — needs Joel sign-off
  if (s.includes('STAINLESS') || (` ${s} `).includes(' SS ')) return '880-03-001'  // placeholder

  let grade: number
  if (s.includes('700')) grade = 700
  else if (s.includes('350')) grade = 350
  else if (s.includes('250')) grade = 250
  else return ''

  const t = Math.round(thicknessMm)
  return MATERIAL_TABLE[grade]?.[t] ?? ''
}
