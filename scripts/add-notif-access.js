const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const hasFloorOrProd = u.access.includes('floor') || u.access.includes('production');
    const hasNotif = u.access.includes('notifications');
    if (hasFloorOrProd && !hasNotif) {
      await prisma.user.update({
        where: { id: u.id },
        data: { access: [...u.access, 'notifications'] }
      });
      console.log(u.name + ' updated');
    }
  }
}

main().then(() => { console.log('Done'); prisma.$disconnect(); }).catch(e => { console.error(e); prisma.$disconnect(); });
