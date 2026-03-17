import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
