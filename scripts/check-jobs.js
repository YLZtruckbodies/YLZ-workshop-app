const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.job.findMany({ orderBy: { num: 'asc' } })
  console.log('=== JOBS IN DB ===')
  jobs.forEach(j => console.log(`  ${j.id.padEnd(12)} num=${j.num.padEnd(12)} type=${j.type}`))
  console.log(`Total: ${jobs.length} jobs`)

  console.log('\n=== COLDFORM KITS — allocatedTo values ===')
  const kits = await prisma.coldformKit.findMany()
  kits.filter(k => k.allocatedTo).forEach(k => console.log(`  Kit: ${k.allocatedTo.padEnd(12)} size=${k.size}`))

  console.log('\n=== COLDFORM CHASSIS — jobNo values ===')
  const chassis = await prisma.coldformChassis.findMany()
  chassis.forEach(c => console.log(`  Chassis: ${c.jobNo.padEnd(12)} length=${c.chassisLength}`))

  console.log('\n=== COLDFORM DELIVERIES — job values ===')
  const del = await prisma.coldformDelivery.findMany()
  del.filter(d => d.hardoxJobs || d.chassisJobs || d.alloyJobs).forEach(d =>
    console.log(`  ${d.date}: hardox=${d.hardoxJobs || '-'} chassis=${d.chassisJobs || '-'} alloy=${d.alloyJobs || '-'}`)
  )
}

main().catch(console.error).finally(() => prisma.$disconnect())
