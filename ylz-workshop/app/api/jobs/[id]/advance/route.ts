import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nextStage, deriveProdGroup } from '@/lib/jobTypes'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const userId = body._userId || ''
  const userName = body._userName || ''

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const next = nextStage(job.stage)
  if (!next) return NextResponse.json({ error: 'Already at final stage' }, { status: 400 })

  // Auto-derive prod group from new stage
  const newProdGroup = deriveProdGroup(next)

  // Advance this job + set prod group
  const updated = await prisma.job.update({
    where: { id: params.id },
    data: { stage: next, prodGroup: newProdGroup },
  })

  // If paired, advance paired job too
  if (job.pairedId) {
    const pairedJob = await prisma.job.findUnique({ where: { id: job.pairedId } })
    if (pairedJob && pairedJob.stage === job.stage) {
      await prisma.job.update({ where: { id: job.pairedId }, data: { stage: next, prodGroup: newProdGroup } })
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

  // ── System note ──
  await prisma.jobNote.create({
    data: {
      jobId: params.id,
      authorId: 'system',
      authorName: 'System',
      type: 'automation',
      message: `Job advanced to ${next}${userName ? ` by ${userName}` : ''}`,
    },
  })

  // ── Notify admins (always) ──
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

  // ── HANDOFF NOTIFICATIONS — notify the right person for each stage ──
  try {
    // Engineering → Ready to Start: notify Liz (MRP) + Keith (scheduler)
    if (job.stage === 'Requires Engineering' && next === 'Ready to Start') {
      const liz = await prisma.user.findFirst({
        where: { name: { contains: 'Liz', mode: 'insensitive' } },
        select: { id: true },
      })
      if (liz) {
        await prisma.notification.create({
          data: {
            userId: liz.id, jobId: params.id, jobNum: job.num,
            type: 'parts-order',
            message: `${job.num} approved by ${userName || 'Engineering'}. MRP checklist ready — enter BOM into MRPeasy.`,
          },
        })
        await prisma.jobTask.create({
          data: { jobId: params.id, title: `Enter ${job.num} into MRPeasy`, assignedTo: liz.id, sortOrder: 1 },
        })
      }

      const keith = await prisma.user.findFirst({
        where: { name: { contains: 'Keith', mode: 'insensitive' } },
        select: { id: true },
      })
      if (keith) {
        await prisma.notification.create({
          data: {
            userId: keith.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) approved for manufacture — waiting on parts before scheduling.`,
          },
        })
      }
    }

    // → Fab: notify floor supervisors
    if (next === 'Fab') {
      const floorUsers = await prisma.user.findMany({
        where: { OR: [
          { section: { contains: 'fab', mode: 'insensitive' } },
          { section: { contains: 'hardox', mode: 'insensitive' } },
          { section: { contains: 'alloy', mode: 'insensitive' } },
          { section: { contains: 'chassis', mode: 'insensitive' } },
        ] },
        select: { id: true },
      })
      if (floorUsers.length) {
        await prisma.notification.createMany({
          data: floorUsers.map((u: any) => ({
            userId: u.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) is now in Fabrication.`,
          })),
        })
      }
    }

    // → Paint: notify paint team
    if (next === 'Paint') {
      const paintUsers = await prisma.user.findMany({
        where: { section: { contains: 'paint', mode: 'insensitive' } },
        select: { id: true },
      })
      if (paintUsers.length) {
        await prisma.notification.createMany({
          data: paintUsers.map((u: any) => ({
            userId: u.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) is ready for Paint.`,
          })),
        })
      }
    }

    // → Fitout: notify fitout team
    if (next === 'Fitout') {
      const fitoutUsers = await prisma.user.findMany({
        where: { OR: [
          { section: { contains: 'fitout', mode: 'insensitive' } },
          { section: { contains: 'subframe', mode: 'insensitive' } },
        ] },
        select: { id: true },
      })
      if (fitoutUsers.length) {
        await prisma.notification.createMany({
          data: fitoutUsers.map((u: any) => ({
            userId: u.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) is ready for Fitout.`,
          })),
        })
      }
    }

    // → QC: notify Matt
    if (next === 'QC') {
      const matt = await prisma.user.findFirst({
        where: { name: { contains: 'Matt', mode: 'insensitive' } },
        select: { id: true },
      })
      if (matt) {
        await prisma.notification.create({
          data: {
            userId: matt.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) is ready for QC inspection.`,
          },
        })
      }
    }

    // → Dispatch: notify Wendy (accounts)
    if (next === 'Dispatch') {
      const wendy = await prisma.user.findFirst({
        where: { name: { contains: 'Wendy', mode: 'insensitive' } },
        select: { id: true },
      })
      if (wendy) {
        await prisma.notification.create({
          data: {
            userId: wendy.id, jobId: params.id, jobNum: job.num,
            type: 'automation',
            message: `${job.num} (${job.customer}) ready for dispatch — invoice and arrange delivery.`,
          },
        })
      }
    }
  } catch { /* non-fatal — handoff notifications shouldn't block advance */ }

  // ── Email (graceful) ──
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
    } catch { /* non-fatal */ }
  }

  return NextResponse.json(updated)
}
