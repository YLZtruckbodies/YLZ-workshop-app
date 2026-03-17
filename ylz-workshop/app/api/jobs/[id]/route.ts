import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TRACKED_FIELDS = ['stage', 'due', 'notes', 'prodGroup', 'estimatedHours', 'startDate', 'flag', 'make', 'po', 'dims', 'vin']

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()

  // Strip meta fields used for activity logging
  const { _userId, _userName, ...data } = body

  // Fetch before-state for diff
  const before = await prisma.job.findUnique({ where: { id: params.id } })
  const job = await prisma.job.update({ where: { id: params.id }, data })

  // Log activity for changed tracked fields
  if (before && (_userId || _userName)) {
    const activities = TRACKED_FIELDS.filter(
      (f) => f in data && String((before as any)[f]) !== String((data as any)[f])
    ).map((f) => ({
      jobId: params.id,
      userId: _userId || '',
      userName: _userName || '',
      field: f,
      fromValue: String((before as any)[f] ?? ''),
      toValue: String((data as any)[f] ?? ''),
    }))

    if (activities.length) {
      await prisma.jobActivity.createMany({ data: activities })
    }
  }

  return NextResponse.json(job)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.job.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
