import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: {
      read: body.read ?? true,
      readAt: body.read !== false ? new Date() : null,
    },
  })
  return NextResponse.json(notification)
}
