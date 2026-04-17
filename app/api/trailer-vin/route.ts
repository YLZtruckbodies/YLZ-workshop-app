import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const START_SEQ = 841183

// VIN year code map (standard model year encoding, skipping I O Q U Z 0)
const YEAR_CODES: Record<number, string> = {
  2026: 'T', 2027: 'V', 2028: 'W', 2029: 'X', 2030: 'Y',
  2031: '1', 2032: '2', 2033: '3', 2034: '4', 2035: '5',
  2036: '6', 2037: '7', 2038: '8', 2039: '9',
  2040: 'A', 2041: 'B', 2042: 'C', 2043: 'D', 2044: 'E',
  2045: 'F', 2046: 'G', 2047: 'H', 2048: 'J', 2049: 'K',
  2050: 'L', 2051: 'M', 2052: 'N',
}

// Trailer type prefix from model string
function vinPrefix(model: string): string {
  if (model.startsWith('DT-')) return '6K9D0GTRL'
  if (model.startsWith('ST-')) return '6K9SEMTRL'
  // CD- (Convertor Dolly) and any Pig Trailer variants
  return '6K9P1GTRL'
}

export async function GET() {
  // Fetch all trailer quotes to find the highest existing sequence number
  const quotes = await prisma.quote.findMany({
    where: { buildType: { in: ['trailer', 'truck-and-trailer'] } },
    select: { configuration: true },
  })

  let maxSeq = START_SEQ - 1

  for (const q of quotes) {
    const cfg = q.configuration as Record<string, any>

    // VIN may be at top level or nested inside trailerConfig
    const vin: string =
      cfg?.vin ||
      cfg?.trailerConfig?.vin ||
      ''

    if (!vin) continue

    // Extract last 6 digits
    const seq = parseInt(vin.slice(-6), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  return NextResponse.json({ nextSeq: maxSeq + 1 })
}
