import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('q')

    const where: any = {}
    if (status) where.status = status
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
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(quotes)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch quotes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lineItems, ...quoteData } = body

  const quote = await prisma.quote.create({
    data: {
      ...quoteData,
      lineItems: lineItems?.length
        ? { create: lineItems }
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
