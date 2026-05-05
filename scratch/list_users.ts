import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function list() {
  const users = await prisma.user.findMany({
    take: 10
  });

  console.log('--- USERS ---');
  users.forEach(u => console.log(`- "${u.name}" (ID: ${u.id})`));
}

list().finally(() => prisma.$disconnect());
