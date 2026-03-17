import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(quote)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch quote' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { lineItems, ...quoteData } = body

    // If lineItems provided, delete old and recreate
    if (lineItems) {
      await prisma.quoteLineItem.deleteMany({ where: { quoteId: params.id } })
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...quoteData,
        lineItems: lineItems?.length
          ? { create: lineItems }
          : undefined,
      },
      include: { lineItems: true },
    })
    return NextResponse.json(quote)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save quote' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.quote.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
