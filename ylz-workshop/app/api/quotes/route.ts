import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('q')
    const jobId = searchParams.get('jobId')

    const where: any = {}
    if (status) where.status = status
    if (jobId) where.jobId = jobId
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { dealerName: { contains: search, mode: 'insensitive' } },
        { buildType: { contains: search, mode: 'insensitive' } },
      ]
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        customerName: true,
        dealerName: true,
        buildType: true,
        total: true,
        overridePrice: true,
        preparedBy: true,
        sentAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        jobId: true,
      },
    })
    return NextResponse.json(quotes)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch quotes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lineItems, ...quoteData } = body

  // Sanitise numeric fields
  const safeFloat = (v: any, fallback = 0): number => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  if ('subtotal' in quoteData) quoteData.subtotal = safeFloat(quoteData.subtotal)
  if ('margin' in quoteData)   quoteData.margin   = safeFloat(quoteData.margin, 25)
  if ('overhead' in quoteData) quoteData.overhead  = safeFloat(quoteData.overhead)
  if ('discount' in quoteData) quoteData.discount  = safeFloat(quoteData.discount)
  if ('total' in quoteData)    quoteData.total     = safeFloat(quoteData.total)
  if ('validDays' in quoteData) quoteData.validDays = Math.round(safeFloat(quoteData.validDays, 30))
  if ('overridePrice' in quoteData) {
    quoteData.overridePrice = quoteData.overridePrice != null ? safeFloat(quoteData.overridePrice) || null : null
  }

  // Sanitise line items
  const cleanItems = Array.isArray(lineItems)
    ? lineItems.map((item: any) => ({
        section:     String(item.section     || 'Build'),
        description: String(item.description || ''),
        quantity:    Math.max(0, Math.round(safeFloat(item.quantity, 1))),
        unitPrice:   safeFloat(item.unitPrice),
        totalPrice:  safeFloat(item.totalPrice),
        sortOrder:   safeFloat(item.sortOrder),
      }))
    : null

  const quote = await prisma.quote.create({
    data: {
      ...quoteData,
      lineItems: cleanItems?.length
        ? { create: cleanItems }
        : undefined,
    },
    include: { lineItems: true },
  })

  // Save to pricing history
  if (quote.total > 0) {
    const configStr = JSON.stringify(quote.configuration)
    const configHash = simpleHash(configStr)
    await prisma.pricingHistory.create({
        data: {
          configHash,
          buildType: quote.buildType,
          configuration: quote.configuration as any,
          quotedPrice: quote.total,
          quoteNumber: quote.quoteNumber,
          customerName: quote.customerName,
        },
      })
    }

    return NextResponse.json(quote, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/quotes]', err)
    return NextResponse.json({ error: err.message || 'Failed to create quote' }, { status: 500 })
  }
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
