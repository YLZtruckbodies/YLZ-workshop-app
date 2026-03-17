import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const activity = await prisma.jobActivity.findMany({
    where: { jobId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(activity)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const record = await prisma.jobActivity.create({
    data: {
      jobId: params.id,
      userId: body.userId || '',
      userName: body.userName || '',
      field: body.field,
      fromValue: body.fromValue || '',
      toValue: body.toValue || '',
    },
  })
  return NextResponse.json(record, { status: 201 })
}
