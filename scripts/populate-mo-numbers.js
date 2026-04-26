const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Derives the MO number for a worker based on their section and the job number
// Sub-numbers from YLZ1122 example (consistent across same BOM structure)
function deriveMO(jobNo, hdr, section) {
  const base = `MO-YLZ${jobNo}`
  if (['hardox', 'alloy', 'steel'].includes(hdr))  return base          // main body MO
  if (hdr === 'paint')                               return `${base}.6`  // body paint
  if (section === 'subfit')                          return `${base}.7`  // subframe
  // chassis, fitout, trailerfit, trailer_chassis — sub-numbers not yet confirmed
  return ''
}

async function main() {
  const workers = await prisma.worker.findMany({ include: { jobs: true } })
  let updated = 0

  for (const worker of workers) {
    for (const job of worker.jobs) {
      if (job.moNumber) {
        console.log(`  SKIP  ${job.jobNo} @ ${worker.name} — already has MO: ${job.moNumber}`)
        continue
      }
      const mo = deriveMO(job.jobNo.trim(), worker.hdr, worker.section)
      if (!mo) {
        console.log(`  SKIP  ${job.jobNo} @ ${worker.name} (${worker.section}) — no rule`)
        continue
      }
      await prisma.workerJob.update({
        where: { id: job.id },
        data: { moNumber: mo },
      })
      console.log(`  SET   ${job.jobNo} @ ${worker.name} (${worker.section}) → ${mo}`)
      updated++
    }
  }

  console.log(`\nDone. Updated ${updated} MO numbers.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
