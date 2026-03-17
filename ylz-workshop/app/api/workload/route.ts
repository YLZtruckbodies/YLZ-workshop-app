import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOURS_PER_WEEK = 35 // production capacity per week

export async function GET() {
  const [jobs, workerJobs, workers] = await Promise.all([
    prisma.job.findMany({
      where: { stage: { not: 'Dispatch' } },
      select: { stage: true, btype: true, estimatedHours: true },
    }),
    prisma.workerJob.findMany({ select: { workerId: true } }),
    prisma.worker.findMany({ select: { id: true, name: true, section: true, color: true } }),
  ])

  // Stage breakdown
  const stageCounts: Record<string, number> = {}
  for (const j of jobs) {
    stageCounts[j.stage] = (stageCounts[j.stage] || 0) + 1
  }
  const stageBreakdown = Object.entries(stageCounts)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count)

  // Worker load
  const workerCount: Record<string, number> = {}
  for (const wj of workerJobs) {
    workerCount[wj.workerId] = (workerCount[wj.workerId] || 0) + 1
  }
  const workerLoad = workers.map((w) => ({
    id: w.id,
    name: w.name,
    section: w.section,
    color: w.color,
    jobCount: workerCount[w.id] || 0,
  })).sort((a, b) => b.jobCount - a.jobCount)

  // Capacity
  const totalHours = jobs.reduce((sum, j) => sum + (j.estimatedHours || 0), 0)
  const weeksBooked = totalHours > 0 ? +(totalHours / HOURS_PER_WEEK).toFixed(1) : 0

  return NextResponse.json({ stageBreakdown, workerLoad, totalHours, weeksBooked })
}
