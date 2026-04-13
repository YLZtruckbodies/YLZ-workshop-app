import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  const where: any = {}
  if (userId) where.userId = userId
  if (unreadOnly) where.read = false

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(notifications)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const notification = await prisma.notification.create({
    data: {
      userId: body.userId,
      jobId: body.jobId || '',
      jobNum: body.jobNum || '',
      type: body.type,
      message: body.message,
    },
  })
  return NextResponse.json(notification, { status: 201 })
}
