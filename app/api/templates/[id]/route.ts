import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const template = await prisma.productTemplate.findUnique({ where: { id: params.id } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const template = await prisma.productTemplate.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.productTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
