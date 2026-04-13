import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nextStage } from '@/lib/jobTypes'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const userId = body._userId || ''
  const userName = body._userName || ''

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const next = nextStage(job.stage)
  if (!next) return NextResponse.json({ error: 'Already at final stage' }, { status: 400 })

  // Advance this job
  const updated = await prisma.job.update({
    where: { id: params.id },
    data: { stage: next },
  })

  // If paired, advance paired job too
  if (job.pairedId) {
    const pairedJob = await prisma.job.findUnique({ where: { id: job.pairedId } })
    if (pairedJob && pairedJob.stage === job.stage) {
      await prisma.job.update({ where: { id: job.pairedId }, data: { stage: next } })
    }
  }

  // ── Activity log ──
  await prisma.jobActivity.create({
    data: {
      jobId: params.id,
      userId,
      userName,
      field: 'stage',
      fromValue: job.stage,
      toValue: next,
    },
  })

  // ── Automation: job note ──
  await prisma.jobNote.create({
    data: {
      jobId: params.id,
      authorId: 'system',
      authorName: 'System',
      type: 'automation',
      message: `Job advanced to ${next}${userName ? ` by ${userName}` : ''}`,
    },
  })

  // ── Automation: notify all admins ──
  const admins = await prisma.user.findMany({ where: { fullAdmin: true }, select: { id: true } })
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a: any) => ({
        userId: a.id,
        jobId: params.id,
        jobNum: job.num,
        type: 'automation',
        message: `${job.num} (${job.customer}) advanced to ${next}`,
      })),
    })
  }

  // ── When advancing from Requires Engineering → Ready to Start: notify Liz ──
  if (job.stage === 'Requires Engineering' && next === 'Ready to Start') {
    try {
      const partsOrder = await prisma.partsOrder.findFirst({
        where: { jobId: params.id, status: 'draft' },
        include: { items: true },
      })

      const liz = await prisma.user.findFirst({
        where: { name: { contains: 'Liz', mode: 'insensitive' } },
        select: { id: true },
      })

      if (liz) {
        // Notify Liz
        const itemList = partsOrder?.items.length
          ? ` — raise POs: ${partsOrder.items.map((i: any) => i.description).join(', ')}`
          : ''
        await prisma.notification.create({
          data: {
            userId: liz.id,
            jobId: params.id,
            jobNum: job.num,
            type: 'parts-order',
            message: `${job.num} approved by ${userName || 'Chris'}${itemList}. Enter into MRPeasy.`,
          },
        })

        // Create task for Liz — completing this will notify Keith
        await prisma.jobTask.create({
          data: {
            jobId: params.id,
            title: `Enter ${job.num} into MRPeasy`,
            assignedTo: liz.id,
            sortOrder: 1,
          },
        })
      }
    } catch { /* non-fatal */ }
  }

  // ── Automation: email (graceful) ──
  const apiKey = process.env.RESEND_API_KEY
  const workshopEmail = process.env.WORKSHOP_EMAIL
  if (apiKey && workshopEmail) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const fromEmail = process.env.FROM_EMAIL || 'noreply@ylztrucks.com.au'
      await resend.emails.send({
        from: fromEmail,
        to: workshopEmail,
        subject: `Job ${job.num} — Advanced to ${next}`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#E8681A">Job Stage Update</h2><p><strong>${job.num}</strong> (${job.customer}) has been advanced to <strong>${next}</strong>${userName ? ` by ${userName}` : ''}.</p></div>`,
      })
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json(updated)
}
