import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VIN_YEAR_CODES: Record<number, string> = {
  2026: 'T', 2027: 'V', 2028: 'W', 2029: 'X', 2030: 'Y',
  2031: '1', 2032: '2', 2033: '3', 2034: '4', 2035: '5',
  2036: '6', 2037: '7', 2038: '8', 2039: '9',
  2040: 'A', 2041: 'B', 2042: 'C', 2043: 'D', 2044: 'E',
  2045: 'F', 2046: 'G', 2047: 'H', 2048: 'J', 2049: 'K',
  2050: 'L', 2051: 'M', 2052: 'N',
}

function trailerVinPrefix(model: string): string {
  if (model.startsWith('DT-')) return '6K9D0GTRL'
  if (model.startsWith('ST-')) return '6K9SEMTRL'
  return '6K9P1GTRL'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const model = searchParams.get('model') || 'DT-4 (4-Axle Dog)'

  const quotes = await prisma.quote.findMany({
    where: { buildType: { in: ['trailer', 'truck-and-trailer'] } },
    select: { configuration: true },
  })

  let maxSeq = 841182
  for (const q of quotes) {
    const cfg = q.configuration as Record<string, any>
    const vin: string = cfg?.vin || cfg?.trailerConfig?.vin || ''
    if (!vin) continue
    const seq = parseInt(vin.slice(-6), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  const year = new Date().getFullYear()
  const yearCode = VIN_YEAR_CODES[year] ?? 'T'
  const prefix = trailerVinPrefix(model)
  const vin = `${prefix}${yearCode}P${maxSeq + 1}`

  return NextResponse.json({ vin })
}
