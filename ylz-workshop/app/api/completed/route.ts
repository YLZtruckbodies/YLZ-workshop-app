import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    // Jobs that are finished (prodGroup=finished) or dispatched (stage=Dispatch)
    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { prodGroup: 'finished' },
          { stage: 'Dispatch' },
          { prodGroup: 'dispatched' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (jobs.length === 0) return NextResponse.json([])

    const jobIds = jobs.map((j: any) => j.id)

    // Fetch stage-change activity for these jobs
    const activities = await prisma.jobActivity.findMany({
      where: {
        jobId: { in: jobIds },
        field: 'stage',
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group activities by jobId
    const actByJob: Record<string, typeof activities> = {}
    for (const a of activities) {
      if (!actByJob[a.jobId]) actByJob[a.jobId] = []
      actByJob[a.jobId].push(a)
    }

    const STAGES = ['Requires Engineering', 'Ready to Start', 'Fab', 'Paint', 'Fitout', 'QC', 'Dispatch']

    const result = jobs.map((job: any) => {
      const acts = actByJob[job.id] || []
      const stageHistory: Record<string, { completedAt: string; completedBy: string }> = {}

      for (const a of acts) {
        // When a job moves FROM a stage, that stage is "done"
        if (a.fromValue && STAGES.includes(a.fromValue)) {
          stageHistory[a.fromValue] = {
            completedAt: a.createdAt.toISOString(),
            completedBy: a.userName || '',
          }
        }
        // Mark the final stage if it's Dispatch or the current stage
        if (a.toValue && (a.toValue === 'Dispatch' || a.toValue === job.stage)) {
          stageHistory[a.toValue] = {
            completedAt: a.createdAt.toISOString(),
            completedBy: a.userName || '',
          }
        }
      }

      return {
        id: job.id,
        num: job.num,
        type: job.type,
        customer: job.customer,
        stage: job.stage,
        prodGroup: job.prodGroup,
        btype: job.btype,
        due: job.due,
        updatedAt: job.updatedAt.toISOString(),
        stageHistory,
      }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
