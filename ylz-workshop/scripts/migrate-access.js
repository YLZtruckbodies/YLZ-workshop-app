const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const access = [...user.access];
    let needsJobboard = false;

    if (access.includes('production') || access.includes('jobs')) {
      needsJobboard = true;
    }

    // Build new access: remove old keys, add jobboard
    let newAccess = access.filter(a => a !== 'production' && a !== 'jobs');
    if (needsJobboard && !newAccess.includes('jobboard')) {
      newAccess.push('jobboard');
    }

    // Check if anything changed
    if (JSON.stringify(newAccess.sort()) !== JSON.stringify(access.sort())) {
      await prisma.user.update({
        where: { id: user.id },
        data: { access: newAccess }
      });
      console.log('Updated ' + user.name + ': ' + JSON.stringify(newAccess));
    } else {
      console.log('No change: ' + user.name);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
