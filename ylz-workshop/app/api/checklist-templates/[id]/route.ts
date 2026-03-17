import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const template = await prisma.checklistTemplate.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(template)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.checklistTemplate.update({
    where: { id: params.id },
    data: { active: false },
  })
  return NextResponse.json({ ok: true })
}
