const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Normalize "YLZ 1083" → "YLZ1083" (strip space between YLZ and number)
function normalize(val) {
  if (!val) return val
  return val.replace(/YLZ\s+/gi, 'YLZ').replace(/ylz\s+/gi, 'YLZ')
}

async function main() {
  // Fix kits - allocatedTo
  const kits = await prisma.coldformKit.findMany()
  for (const k of kits) {
    const fixed = normalize(k.allocatedTo)
    if (fixed !== k.allocatedTo) {
      await prisma.coldformKit.update({ where: { id: k.id }, data: { allocatedTo: fixed } })
      console.log(`Kit: "${k.allocatedTo}" → "${fixed}"`)
    }
  }

  // Fix chassis - jobNo
  const chassis = await prisma.coldformChassis.findMany()
  for (const c of chassis) {
    const fixed = normalize(c.jobNo)
    if (fixed !== c.jobNo) {
      await prisma.coldformChassis.update({ where: { id: c.id }, data: { jobNo: fixed } })
      console.log(`Chassis: "${c.jobNo}" → "${fixed}"`)
    }
  }

  // Fix deliveries - hardoxJobs, chassisJobs, alloyJobs
  const deliveries = await prisma.coldformDelivery.findMany()
  for (const d of deliveries) {
    const updates = {}
    const fixedH = normalize(d.hardoxJobs)
    const fixedC = normalize(d.chassisJobs)
    const fixedA = normalize(d.alloyJobs)
    if (fixedH !== d.hardoxJobs) updates.hardoxJobs = fixedH
    if (fixedC !== d.chassisJobs) updates.chassisJobs = fixedC
    if (fixedA !== d.alloyJobs) updates.alloyJobs = fixedA
    if (Object.keys(updates).length > 0) {
      await prisma.coldformDelivery.update({ where: { id: d.id }, data: updates })
      console.log(`Delivery ${d.date}: ${JSON.stringify(updates)}`)
    }
  }

  console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
