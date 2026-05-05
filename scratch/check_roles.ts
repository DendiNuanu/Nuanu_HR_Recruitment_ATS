import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRoles() {
  const roles = await prisma.role.findMany();
  console.log('--- ROLES ---');
  roles.forEach(r => console.log(`- Slug: "${r.slug}", Name: "${r.name}"`));

  const userRoles = await prisma.userRole.findMany({
    include: { role: true, user: true }
  });
  console.log('\n--- USER ROLES ---');
  userRoles.forEach(ur => console.log(`- User: "${ur.user.name}", Role Slug: "${ur.role.slug}"`));
}

checkRoles().finally(() => prisma.$disconnect());
