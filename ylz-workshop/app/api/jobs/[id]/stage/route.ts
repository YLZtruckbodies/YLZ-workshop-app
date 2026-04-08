import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { STAGES } from '@/lib/jobTypes'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const { stage, userId = '', userName = '' } = body

  if (!stage || !STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (job.stage === stage) return NextResponse.json(job)

  const updated = await prisma.job.update({
    where: { id: params.id },
    data: { stage },
  })

  await prisma.jobActivity.create({
    data: {
      jobId: params.id,
      userId,
      userName,
      field: 'stage',
      fromValue: job.stage,
      toValue: stage,
    },
  })

  await prisma.jobNote.create({
    data: {
      jobId: params.id,
      authorId: 'system',
      authorName: 'System',
      type: 'automation',
      message: `Stage changed to ${stage}${userName ? ` by ${userName}` : ''}`,
    },
  })

  // Notify admins
  const admins = await prisma.user.findMany({ where: { fullAdmin: true }, select: { id: true } })
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a: any) => ({
        userId: a.id,
        jobId: params.id,
        jobNum: job.num,
        type: 'automation',
        message: `${job.num} (${job.customer}) moved to ${stage}`,
      })),
    })
  }

  return NextResponse.json(updated)
}
