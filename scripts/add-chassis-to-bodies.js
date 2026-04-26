const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CHASSIS_WORKER = 'andres'

function needsChassis(btype) {
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
  const andresJobs = await prisma.workerJob.findMany({ where: { workerId: CHASSIS_WORKER } })
  const andresNums = new Set(andresJobs.map(j => j.jobNo.trim()))
  const maxPos = andresJobs.reduce((m, j) => j.position > m ? j.position : m, -1)
  let nextPos = maxPos + 1

  const boardJobs = await prisma.job.findMany()
  const jobMap = {}
  for (const j of boardJobs) {
    const num = j.num.replace(/^YLZ\s*/i, '').trim()
    jobMap[num] = j
  }

  const allWorkerJobs = await prisma.workerJob.findMany({ distinct: ['jobNo'] })
  const scheduleNums = [...new Set(allWorkerJobs.map(j => j.jobNo.trim()))]

  let added = 0

  for (const jobNo of scheduleNums) {
    if (andresNums.has(jobNo)) continue

    const boardJob = jobMap[jobNo]
    if (!boardJob || !needsChassis(boardJob.btype)) continue

    await prisma.workerJob.create({
      data: {
        workerId: CHASSIS_WORKER,
        jobNo,
        type: boardJob.btype || 'JOB',
        start: '',
        days: 1,
        position: nextPos,
      },
    })
    andresNums.add(jobNo)
    console.log(`+ ${jobNo} (${boardJob.btype}) → ${CHASSIS_WORKER} pos ${nextPos}`)
    nextPos++
    added++
  }

  console.log(`\nDone. Added ${added} entries to ${CHASSIS_WORKER}.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
