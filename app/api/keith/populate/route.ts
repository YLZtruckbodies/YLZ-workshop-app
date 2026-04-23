import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const STAGE_INDEX: Record<string, number> = {
  'Requires Engineering': 0,
  'Ready to Start': 1,
  'Fab': 2,
  'Paint': 3,
  'Fitout': 4,
  'QC': 5,
  'Dispatch': 6,
}

// Primary worker per section
const PRIMARY = {
  hardox: 'jd',
  alloy: 'ben_alloy',
  chassis: 'andres',
  trailerfit: 'mark',
  fitout: 'bailey',
  paint: 'bradley',
}

// Which section each worker belongs to (for dedup)
const WORKER_SECTION: Record<string, string> = {
  jd: 'hardox', rav: 'hardox', simon: 'hardox',
  ben_alloy: 'alloy', darwin: 'alloy', julio: 'alloy',
  andres: 'chassis', dennis: 'chassis', herson: 'chassis',
  kabaj: 'chassis', mohit: 'chassis', rob: 'chassis',
  bailey: 'fitout', dan: 'fitout', dolan: 'fitout', tony: 'fitout',
  bradley: 'paint',
  arvi: 'trailerfit', mark: 'trailerfit',
  nathan_w: 'subfit',
}

function getTargetSections(btype: string, stage: string): string[] {
  const si = STAGE_INDEX[stage] ?? 0
  const bt = (btype || '').toLowerCase()
  const isAlloy = bt.includes('ally')
  const isTrailer = bt.includes('trailer') || bt === 'dolly'
  const isDolly = bt === 'dolly'
  const isWheelbase = bt === 'wheelbase'

  const sections: string[] = []

  // Fab/body section — only if job hasn't reached Paint yet
  if (si < 3 && !isWheelbase && !isDolly) {
    sections.push(isAlloy ? 'alloy' : 'hardox')
  }

  // Chassis / Trailer fitout — only if job hasn't reached Fitout yet
  if (si < 4) {
    sections.push(isTrailer ? 'trailerfit' : 'chassis')
  }

  // Paint — only if job hasn't reached Fitout yet
  if (si < 4 && !isWheelbase && !isDolly) {
    sections.push('paint')
  }

  // Fitout — only if job hasn't reached QC yet
  if (si < 5 && !isDolly) {
    sections.push('fitout')
  }

  return [...new Set(sections)]
}

function normaliseNum(num: string): string {
  return num.replace(/^YLZ\s*/i, '').trim()
}

export async function POST() {
  // All active jobs (skip Dispatch and Requires Sales)
  const jobs = await prisma.job.findMany({
    where: { stage: { notIn: ['Dispatch', 'Requires Sales'] } },
    select: { num: true, type: true, stage: true, btype: true },
  })

  // All existing worker jobs
  const existingWJ = await prisma.workerJob.findMany({
    select: { jobNo: true, workerId: true, position: true },
  })

  // Build per-section dedup sets
  const sectionHas: Record<string, Set<string>> = {
    hardox: new Set(), alloy: new Set(), chassis: new Set(),
    trailerfit: new Set(), subfit: new Set(), fitout: new Set(), paint: new Set(),
  }
  existingWJ.forEach((wj) => {
    const sec = WORKER_SECTION[wj.workerId]
    if (sec && sectionHas[sec]) sectionHas[sec].add(wj.jobNo)
  })

  // Max position per worker (so new rows go at end)
  const maxPos: Record<string, number> = {}
  existingWJ.forEach((wj) => {
    maxPos[wj.workerId] = Math.max(maxPos[wj.workerId] ?? 0, wj.position + 1)
  })

  const toCreate: Array<{
    workerId: string; jobNo: string; type: string; start: string; days: number; position: number
  }> = []

  for (const job of jobs) {
    const jobNo = normaliseNum(job.num)
    const targetSections = getTargetSections(job.btype || '', job.stage)

    for (const sec of targetSections) {
      if (sectionHas[sec]?.has(jobNo)) continue // already scheduled in this section

      const workerId = PRIMARY[sec as keyof typeof PRIMARY]
      if (!workerId) continue

      const pos = maxPos[workerId] ?? 0
      maxPos[workerId] = pos + 1
      sectionHas[sec].add(jobNo) // mark as added so we don't double-add

      toCreate.push({ workerId, jobNo, type: job.type, start: '', days: 1, position: pos })
    }
  }

  for (const entry of toCreate) {
    await prisma.workerJob.create({ data: entry })
  }

  return NextResponse.json({
    added: toCreate.length,
    message: `Added ${toCreate.length} entries across Keith's schedule`,
  })
}
