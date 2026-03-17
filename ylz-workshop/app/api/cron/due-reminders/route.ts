import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseDate } from '@/lib/workdays'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.job.findMany({
    where: {
      due: { not: '' },
      stage: { notIn: ['Dispatch'] },
    },
    select: { id: true, num: true, due: true, customer: true, type: true },
  })

  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const dueSoon = jobs.filter((j) => {
    const d = parseDate(j.due)
    if (!d) return false
    return d >= now && d <= in3Days
  })

  const overdue = jobs.filter((j) => {
    const d = parseDate(j.due)
    if (!d) return false
    return d < now
  })

  let created = 0

  for (const job of [...dueSoon, ...overdue]) {
    const isOverdue = parseDate(job.due)! < now
    const message = isOverdue
      ? `Job ${job.num} (${job.customer}) is OVERDUE — due ${job.due}`
      : `Job ${job.num} (${job.customer}) is due on ${job.due}`

    // Check if reminder already sent today
    const existing = await prisma.jobNote.findFirst({
      where: {
        jobId: job.id,
        type: 'reminder',
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    })
    if (existing) continue

    await prisma.jobNote.create({
      data: {
        jobId: job.id,
        authorId: 'system',
        authorName: 'System',
        type: 'reminder',
        message,
      },
    })

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { fullAdmin: true }, select: { id: true } })
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          jobId: job.id,
          jobNum: job.num,
          type: 'reminder',
          message,
        },
      })
    }
    created++
  }

  return NextResponse.json({ ok: true, created, dueCount: dueSoon.length, overdueCount: overdue.length })
}
