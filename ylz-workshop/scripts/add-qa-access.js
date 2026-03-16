const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userIds = ['nathan', 'keith', 'matt', 'ben', 'simon']
  for (const id of userIds) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (user && !user.access.includes('qa')) {
      await prisma.user.update({
        where: { id },
        data: { access: [...user.access, 'qa'] },
      })
      console.log(`Added qa access for ${user.name}`)
    } else if (user) {
      console.log(`${user.name} already has qa access`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
