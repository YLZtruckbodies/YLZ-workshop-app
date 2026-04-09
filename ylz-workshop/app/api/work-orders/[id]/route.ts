import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.workOrder.findUnique({
    where: { id: params.id },
    include: { parts: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const order = await prisma.workOrder.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(order)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.workOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
