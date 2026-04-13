import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { items } = await req.json()

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  // Batch update sort orders in a transaction
  await prisma.$transaction(
    items.map((item: { id: string; sortOrder: number; prodGroup?: string }) =>
      prisma.job.update({
        where: { id: item.id },
        data: {
          sortOrder: item.sortOrder,
          ...(item.prodGroup ? { prodGroup: item.prodGroup } : {}),
        },
      })
    )
  )

  return NextResponse.json({ success: true })
}
