import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const job = await prisma.jobMaster.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(job)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.jobMaster.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
