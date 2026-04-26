const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SUBFIT_WORKER = 'nathan_w'
const BODY_BTYPES = ['hardox-body', 'ally-body', 'truck', 'beavertail']

function isBodyType(btype) {
  if (!btype) return false
  const b = btype.toLowerCase()
  return (
    (b.includes('hardox') && b.includes('body')) ||
    (b.includes('ally') && b.includes('body')) ||
    b.includes('truck') ||
    b.includes('beavertail')
  )
}

async function main() {
  // Get all worker jobs for nathan_w
  const nathanJobs = await prisma.workerJob.findMany({ where: { workerId: SUBFIT_WORKER } })
  const nathanNums = new Set(nathanJobs.map(j => j.jobNo.trim()))
  const maxPos = nathanJobs.reduce((m, j) => j.position > m ? j.position : m, -1)
  let nextPos = maxPos + 1

  // Get board jobs
  const boardJobs = await prisma.job.findMany()
  const jobMap = {}
  for (const j of boardJobs) {
    const num = j.num.replace(/^YLZ\s*/i, '').trim()
    jobMap[num] = j
  }

  // All unique jobNos in schedule
  const allWorkerJobs = await prisma.workerJob.findMany({ distinct: ['jobNo'] })
  const scheduleNums = [...new Set(allWorkerJobs.map(j => j.jobNo.trim()))]

  let added = 0

  for (const jobNo of scheduleNums) {
    if (nathanNums.has(jobNo)) continue

    const boardJob = jobMap[jobNo]
    if (!boardJob) continue
    if (!isBodyType(boardJob.btype)) continue

    await prisma.workerJob.create({
      data: {
        workerId: SUBFIT_WORKER,
        jobNo,
        type: boardJob.btype || 'JOB',
        start: '',
        days: 1,
        position: nextPos,
      },
    })
    nathanNums.add(jobNo)
    console.log(`+ ${jobNo} (${boardJob.btype}) → ${SUBFIT_WORKER} pos ${nextPos}`)
    nextPos++
    added++
  }

  console.log(`\nDone. Added ${added} entries to ${SUBFIT_WORKER}.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
