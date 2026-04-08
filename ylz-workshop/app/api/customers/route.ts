import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const quotes = await prisma.quote.findMany({
    select: {
      customerName: true,
      dealerName: true,
      status: true,
      total: true,
      overridePrice: true,
      buildType: true,
      createdAt: true,
      quoteNumber: true,
      id: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Aggregate by customerName
  const map = new Map<string, {
    customerName: string
    dealerName: string
    quoteCount: number
    acceptedCount: number
    totalValue: number
    acceptedValue: number
    buildTypes: Set<string>
    lastQuoteAt: string
    recentQuotes: { id: string; quoteNumber: string; status: string; total: number; buildType: string; createdAt: string }[]
  }>()

  for (const q of quotes) {
    const key = q.customerName.trim().toLowerCase()
    const effectiveTotal = q.overridePrice ?? q.total
    if (!map.has(key)) {
      map.set(key, {
        customerName: q.customerName,
        dealerName: q.dealerName || '',
        quoteCount: 0,
        acceptedCount: 0,
        totalValue: 0,
        acceptedValue: 0,
        buildTypes: new Set(),
        lastQuoteAt: q.createdAt.toISOString(),
        recentQuotes: [],
      })
    }
    const entry = map.get(key)!
    entry.quoteCount++
    entry.totalValue += effectiveTotal
    if (q.status === 'accepted') {
      entry.acceptedCount++
      entry.acceptedValue += effectiveTotal
    }
    if (q.buildType) entry.buildTypes.add(q.buildType)
    if (entry.recentQuotes.length < 5) {
      entry.recentQuotes.push({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        total: effectiveTotal,
        buildType: q.buildType,
        createdAt: q.createdAt.toISOString(),
      })
    }
    if (new Date(q.createdAt) > new Date(entry.lastQuoteAt)) {
      entry.lastQuoteAt = q.createdAt.toISOString()
    }
  }

  const customers = Array.from(map.values())
    .map((c) => ({
      ...c,
      buildTypes: Array.from(c.buildTypes),
      winRate: c.quoteCount > 0 ? Math.round((c.acceptedCount / c.quoteCount) * 100) : 0,
    }))
    .sort((a, b) => b.quoteCount - a.quoteCount)

  return NextResponse.json(customers)
}
