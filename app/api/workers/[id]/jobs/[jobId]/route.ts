import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const STAGE_ORDER = [
  'Requires Engineering',
  'Ready to Start',
  'Fab',
  'Paint',
  'Fitout',
  'QC',
  'Dispatch',
]

function stageIndex(s: string) {
  return STAGE_ORDER.indexOf(s)
}

// Production flow:
//   Chassis prep → Fab (body fab begins)
//   Hardox / Alloy / Steel body done → Paint
//   Paint done → Fitout
//   Body fitout / subframe fitout / trailer fitout done → QC
function nextStageForSection(hdr: string, section: string, currentStage: string): string | null {
  const si = stageIndex(currentStage)

  // Truck or trailer chassis prep done → Fab
  if (hdr === 'chassis' || section === 'trailer_chassis') {
    if (si < stageIndex('Fab')) return 'Fab'
  }

  // Body fabrication done → Paint
  if (['hardox', 'steel', 'alloy'].includes(hdr)) {
    if (si <= stageIndex('Fab')) return 'Paint'
  }

  // Paint done → Fitout
  if (hdr === 'paint' && currentStage === 'Paint') return 'Fitout'

  // Any fitout section done → QC
  if (['fitout', 'trailerfit', 'subfit'].includes(section) && currentStage === 'Fitout') return 'QC'

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; jobId: string } },
) {
  const body = await req.json() as { done?: boolean; moNumber?: string; mrpProcessed?: boolean }

  const updateData: Record<string, any> = {}

  if (body.moNumber !== undefined)     updateData.moNumber = body.moNumber
  if (body.mrpProcessed !== undefined) updateData.mrpProcessed = body.mrpProcessed

  if (body.done !== undefined) {
    updateData.done = body.done
    updateData.completedAt = body.done ? new Date() : null
    if (body.done === false) updateData.mrpProcessed = false // reset if un-done
  }

  const workerJob = await (prisma.workerJob as any).update({
    where: { id: params.jobId },
    data: updateData,
  })

  // When marking done, advance job board stage and notify Liz
  if (body.done === true && workerJob.jobNo) {
    const worker = await prisma.worker.findUnique({ where: { id: params.id } })

    if (worker) {
      const jobNo = workerJob.jobNo.trim()

      // Advance job board stage
      const job = await prisma.job.findFirst({
        where: {
          OR: [
            { num: `YLZ${jobNo}` },
            { num: `YLZ ${jobNo}` },
            { num: jobNo },
          ],
        },
      })

      if (job) {
        const next = nextStageForSection(worker.hdr, worker.section, job.stage)
        if (next && stageIndex(next) > stageIndex(job.stage)) {
          await prisma.job.update({
            where: { id: job.id },
            data: { stage: next },
          })
        }
      }

      // Notify Liz
      const liz = await prisma.user.findFirst({ where: { name: { contains: 'Liz', mode: 'insensitive' } } })
      if (liz) {
        const mo = (workerJob as any).moNumber ? ` — MO: ${(workerJob as any).moNumber}` : ''
        await prisma.notification.create({
          data: {
            userId: liz.id,
            jobNum: jobNo,
            type: 'keith_complete',
            message: `${worker.name} (${worker.section}) marked job ${jobNo} complete${mo}. Update MRP.`,
          },
        })
      }
    }
  }

  return NextResponse.json(workerJob)
}
