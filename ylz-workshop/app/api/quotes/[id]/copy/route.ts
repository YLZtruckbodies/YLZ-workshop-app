import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const original = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { lineItems: true },
  })

  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get next quote number
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  })
  let nextNum = 3000
  if (lastQuote?.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/QU-(\d+)/)
    if (match) nextNum = Math.max(3000, parseInt(match[1], 10) + 1)
  }
  const newQuoteNumber = `QU-${String(nextNum).padStart(4, '0')}`

  const copy = await prisma.quote.create({
    data: {
      quoteNumber:   newQuoteNumber,
      status:        'draft',
      customerName:  original.customerName,
      dealerName:    original.dealerName,
      contactName:   original.contactName,
      contactEmail:  original.contactEmail,
      contactPhone:  original.contactPhone,
      buildType:     original.buildType,
      configuration: original.configuration as any,
      subtotal:      original.subtotal,
      margin:        original.margin,
      overhead:      original.overhead,
      discount:      original.discount,
      total:         original.total,
      overridePrice: original.overridePrice,
      overrideNote:  original.overrideNote ? `Copied from ${original.quoteNumber}` : null,
      preparedBy:    original.preparedBy,
      salesPerson:   original.salesPerson,
      validDays:     original.validDays,
      notes:         original.notes,
      terms:         original.terms,
      lineItems: {
        create: original.lineItems.map(li => ({
          section:     li.section,
          description: li.description,
          quantity:    li.quantity,
          unitPrice:   li.unitPrice,
          totalPrice:  li.totalPrice,
          sortOrder:   li.sortOrder,
        })),
      },
    },
  })

  return NextResponse.json({ id: copy.id, quoteNumber: copy.quoteNumber })
}
