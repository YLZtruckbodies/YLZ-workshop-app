import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const item = await prisma.coldformChassis.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.coldformChassis.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
