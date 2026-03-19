export interface MOPart {
  partNumber: string
  description: string
  quantity: string
  material: string
  thickness: string   // extracted e.g. "12mm"
  isLaserCut: boolean
}

export interface MOData {
  moNumber: string
  product: string
  quantity: string
  date: string
  parts: MOPart[]
  laserParts: MOPart[]
}

const LASER_OPS = ['LASERCUT', 'LASTCUT', 'LASER CUT']

export function parseMO(text: string): MOData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const full  = lines.join('\n')

  // ── Header ────────────────────────────────────────────────────────────────
  const moNumber = extract(full, /Number:\s*(MO-[\w]+)/) ?? 'Unknown'
  const product  = extract(full, /Product:\s*([^\n]+)/)  ?? 'Unknown'
  const quantity = extract(full, /Quantity:\s*([^\n]+)/)  ?? ''
  const date     = extract(full, /(\d{2}\/\d{2}\/\d{4})/) ?? ''

  // ── Split sections ────────────────────────────────────────────────────────
  const opsIdx    = full.indexOf('Operations:')
  const partsText = opsIdx > -1 ? full.slice(0, opsIdx) : full
  const opsText   = opsIdx > -1 ? full.slice(opsIdx)    : ''

  // ── Identify LASERCUT parts from Operations section ───────────────────────
  const laserSet = new Set<string>()
  let curOpPart: string | null = null
  for (const line of opsText.split('\n').map(l => l.trim())) {
    // MRP-03: use \b instead of ^ so part numbers aren't missed when preceded by whitespace/content
    const m = line.match(/\b([1-7]\d{2}-\d{2}-\d{3})\b/)
    if (m) { curOpPart = m[1]; continue }
    if (curOpPart && LASER_OPS.some(op => line.toUpperCase().includes(op))) {
      laserSet.add(curOpPart)
    }
  }

  // ── Extract parts + materials ─────────────────────────────────────────────
  const allMatches = Array.from(partsText.matchAll(/\b(\d{3}-\d{2}-\d{3})\b/g))
  const parts: MOPart[] = []
  const seen  = new Set<string>()

  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i]
    const num   = match[1]

    // Skip stock codes (8xx-xx-xxx) and duplicates
    if (/^8\d{2}/.test(num) || seen.has(num)) continue
    seen.add(num)

    const segStart = (match.index ?? 0) + num.length
    const nextPart = allMatches.slice(i + 1).find(m => !/^8\d{2}/.test(m[1]) && !seen.has(m[1]))
    const segEnd   = nextPart?.index ?? partsText.length
    const chunk    = partsText.slice(segStart, segEnd)
    const cLines   = chunk.split('\n').map(l => l.trim()).filter(Boolean)

    // Description
    const desc = cLines.find(l =>
      !/^(Stock|Consumed|Booked|Lot|Status|Storage|Available|Created)/i.test(l) &&
      !/^\d+\s*(EACH)?$/.test(l) &&
      l.length > 3
    ) ?? ''

    // Quantity — MRP-05: accept EA, PCS, PC, UNIT in addition to EACH
    const qtyMatch = chunk.match(/(\d+)\s+(?:EACH|EA|PCS|PC|UNIT)/i)
    const qty = qtyMatch ? `${qtyMatch[1]} EACH` : ''

    // Material — find stock code line then read next descriptive line
    const stockMatch = chunk.match(/\b(8\d{2}-\d{2}-\d{3})\b/)
    let material = ''
    if (stockMatch) {
      const afterStock = chunk.slice(chunk.indexOf(stockMatch[0]) + stockMatch[0].length)
        .split('\n').map(l => l.trim()).filter(Boolean)
      material = afterStock.find(l => l.length > 3 && !/^\d{3}-\d{2}-\d{3}/.test(l)) ?? ''
    }

    parts.push({
      partNumber: num,
      description: clean(desc),
      quantity: qty,
      material: clean(material),
      thickness: extractThickness(material),
      isLaserCut: laserSet.has(num),
    })
  }

  const laserParts = parts.filter(p => p.isLaserCut)
  return { moNumber, product, quantity, date, parts, laserParts }
}

export function extractThickness(material: string): string {
  const m = material.match(/(\d+(?:\.\d+)?)\s*[Mm][Mm]/)
  return m ? `${m[1]}mm` : 'Unknown'
}

function extract(text: string, re: RegExp): string | null {
  return text.match(re)?.[1]?.trim() ?? null
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}
