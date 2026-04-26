import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const result = await prisma.vinPlateRecord.updateMany({
  where: { plateOnChassis: false },
  data: { plateOnChassis: true },
})
console.log(`set-plate-on-chassis: updated ${result.count} records`)
await prisma.$disconnect()
