const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Primary worker per section
const PRIMARY = {
  hardox:          'jd',
  alloy:           'ben_alloy',
  chassis:         'andres',
  trailer_chassis: 'mohit',
  trailerfit:      'mark',
  subfit:          'nathan_w',
  fitout:          'bailey',
  paint:           'bradley',
}

// Jobs we know are Dispatched — skip them
const SKIP = new Set(['993', '999', '1063', '1072'])

// Target workers based on btype
// All body types (hardox-body, ally-body, truck, beavertail) get subframe fitout (nathan_w)
// Trailer types get trailer fitout (mark) instead
function targetWorkers(btype) {
  if (!btype) return []
  const b = btype.toLowerCase()
  if (b.includes('hardox') && b.includes('body'))    return [PRIMARY.hardox,  PRIMARY.chassis, PRIMARY.paint, PRIMARY.subfit, PRIMARY.fitout]
  if (b.includes('hardox') && b.includes('trailer')) return [PRIMARY.hardox,  PRIMARY.paint, PRIMARY.trailerfit]
  if (b.includes('ally')   && b.includes('body'))    return [PRIMARY.alloy,   PRIMARY.chassis, PRIMARY.paint, PRIMARY.subfit, PRIMARY.fitout]
  if (b.includes('ally')   && b.includes('trailer')) return [PRIMARY.alloy,   PRIMARY.paint, PRIMARY.trailerfit]
  if (b.includes('truck') || b.includes('beavertail')) return [PRIMARY.chassis, PRIMARY.paint, PRIMARY.subfit, PRIMARY.fitout]
  return []
}

async function main() {
  // Load all workers and their current jobs
  const workers = await prisma.worker.findMany({ include: { jobs: true } })
  const workerJobSet = {}
  const workerMaxPos = {}
  for (const w of workers) {
    workerJobSet[w.id] = new Set(w.jobs.map(j => j.jobNo.trim()))
    const maxJob = w.jobs.reduce((m, j) => j.position > m ? j.position : m, -1)
    workerMaxPos[w.id] = maxJob
  }

  // Load board jobs
  const boardJobs = await prisma.job.findMany()
  const jobMap = {}
  for (const j of boardJobs) {
    const num = j.num.replace(/^YLZ\s*/i, '').trim()
    jobMap[num] = j
  }

  // Collect all unique jobNos currently in Keith's schedule
  const allWorkerJobs = await prisma.workerJob.findMany({ distinct: ['jobNo'] })
  const scheduleNums = [...new Set(allWorkerJobs.map(j => j.jobNo.trim()))]
  console.log(`Jobs in schedule: ${scheduleNums.join(', ')}\n`)

  let added = 0

  for (const jobNo of scheduleNums) {
    if (SKIP.has(jobNo)) {
      console.log(`${jobNo}: SKIPPED (dispatched)`)
      continue
    }

    const boardJob = jobMap[jobNo]
    if (!boardJob) {
      console.log(`${jobNo}: not on job board — skipping`)
      continue
    }

    const btype = boardJob.btype
    const stage = boardJob.stage
    const targets = targetWorkers(btype)

    if (targets.length === 0) {
      console.log(`${jobNo}: btype="${btype}" stage="${stage}" — no propagation rule, skipping`)
      continue
    }

    console.log(`${jobNo}: btype="${btype}" stage="${stage}" → targets: ${targets.join(', ')}`)

    for (const workerId of targets) {
      if (!workerJobSet[workerId]) {
        console.log(`  ${workerId}: worker not found in DB`)
        continue
      }
      if (workerJobSet[workerId].has(jobNo)) {
        console.log(`  ${workerId}: already has it`)
        continue
      }

      const nextPos = workerMaxPos[workerId] + 1
      await prisma.workerJob.create({
        data: {
          workerId,
          jobNo,
          type: btype || 'JOB',
          start: '',
          days: 1,
          position: nextPos,
        },
      })
      workerJobSet[workerId].add(jobNo)
      workerMaxPos[workerId] = nextPos
      console.log(`  + added to ${workerId} (pos ${nextPos})`)
      added++
    }
  }

  console.log(`\nDone. Added ${added} worker job entries.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
