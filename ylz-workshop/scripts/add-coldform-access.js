const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userIds = ['nathan', 'keith', 'simon']
  for (const id of userIds) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (user && !user.access.includes('coldform')) {
      await prisma.user.update({
        where: { id },
        data: { access: [...user.access, 'coldform'] },
      })
      console.log(`Added coldform access for ${user.name}`)
    } else if (user) {
      console.log(`${user.name} already has coldform access`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
