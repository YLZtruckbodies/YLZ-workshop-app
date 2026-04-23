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

// What stage should this section completion advance the job to?
function nextStageForSection(hdr: string, section: string, currentStage: string): string | null {
  const si = stageIndex(currentStage)
  // Body / chassis fab sections → advance to Paint
  if (['hardox', 'steel', 'alloy', 'chassis'].includes(hdr) || section === 'trailerfit') {
    if (si >= 0 && si <= stageIndex('Fab')) return 'Paint'
  }
  // Paint → Fitout
  if (hdr === 'paint' && currentStage === 'Paint') return 'Fitout'
  // Fitout → QC
  if (hdr === 'fitout' && section === 'fitout' && currentStage === 'Fitout') return 'QC'
  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; jobId: string } },
) {
  const { done } = await req.json() as { done: boolean }

  const workerJob = await prisma.workerJob.update({
    where: { id: params.jobId },
    data: { done },
  })

  // When marking done, try to advance the job board stage
  if (done && workerJob.jobNo) {
    const worker = await prisma.worker.findUnique({ where: { id: params.id } })
    if (worker) {
      // Find job by normalised number
      const jobNo = workerJob.jobNo.trim()
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
    }
  }

  return NextResponse.json(workerJob)
}
