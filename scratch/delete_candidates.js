const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Delete all applications first (this clears up dependencies)
    const apps = await prisma.application.deleteMany();
    console.log(`Deleted ${apps.count} applications.`);

    // 2. Find users who are NOT admins
    // We want to delete candidates, but safely. 
    // Usually, admins have the 'admin' role.
    const users = await prisma.user.findMany({
      include: { userRoles: { include: { role: true } } }
    });

    const candidatesToDelete = users.filter(u => {
      const roles = u.userRoles.map(ur => ur.role.slug);
      return !roles.includes('admin') && !roles.includes('super_admin');
    });

    const idsToDelete = candidatesToDelete.map(u => u.id);

    if (idsToDelete.length > 0) {
      const deleted = await prisma.user.deleteMany({
        where: { id: { in: idsToDelete } }
      });
      console.log(`Deleted ${deleted.count} candidate users.`);
    } else {
      console.log('No candidate users found to delete.');
    }

  } catch (error) {
    console.error('Error during deletion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
