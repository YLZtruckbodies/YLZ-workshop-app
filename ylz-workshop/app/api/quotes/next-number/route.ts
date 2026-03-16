import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  })

  let nextNum = 1
  if (lastQuote?.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/QU-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const quoteNumber = `QU-${String(nextNum).padStart(4, '0')}`
  return NextResponse.json({ quoteNumber })
}
