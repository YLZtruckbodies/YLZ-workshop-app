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

    // BUG-02: server-side guard — block sending a $0 or nameless quote
    if (body.status === 'sent') {
      const total = body.overridePrice ?? body.total ?? 0
      const name = (body.customerName || '').trim().toLowerCase()
      if (total === 0) {
        return NextResponse.json({ error: 'Cannot mark as Sent: quote total is $0' }, { status: 422 })
      }
      if (!name || name === 'tbc') {
        return NextResponse.json({ error: 'Cannot mark as Sent: customer name is required' }, { status: 422 })
      }
    }

    // BUG-05: set acceptedAt when transitioning to accepted (if not already set)
    let acceptedAtPatch: { acceptedAt: Date } | Record<string, never> = {}
    if (body.status === 'accepted') {
      const existing = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { acceptedAt: true },
      })
      if (!existing?.acceptedAt) {
        acceptedAtPatch = { acceptedAt: new Date() }
      }
    }

    // If lineItems provided, delete old and recreate
    if (lineItems) {
      await prisma.quoteLineItem.deleteMany({ where: { quoteId: params.id } })
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...quoteData,
        ...acceptedAtPatch,
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
