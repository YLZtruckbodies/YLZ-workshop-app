import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; partId: string } }) {
  const body = await req.json()
  const part = await prisma.workOrderPart.update({
    where: { id: params.partId },
    data: body,
  })
  return NextResponse.json(part)
}
