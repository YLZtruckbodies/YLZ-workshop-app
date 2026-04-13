import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  })

  let nextNum = 3000
  if (lastQuote?.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/QU-(\d+)/)
    if (match) nextNum = Math.max(3000, parseInt(match[1], 10) + 1)
  }

  const quoteNumber = `QU-${String(nextNum).padStart(4, '0')}`
  return NextResponse.json({ quoteNumber })
}
