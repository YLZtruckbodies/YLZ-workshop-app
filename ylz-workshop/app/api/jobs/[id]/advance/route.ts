import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nextStage } from '@/lib/jobTypes'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
      await prisma.job.update({
        where: { id: job.pairedId },
        data: { stage: next },
      })
    }
  }

  return NextResponse.json(updated)
}
