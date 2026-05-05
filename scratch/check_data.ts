import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const dendi = await prisma.user.findFirst({
    where: { name: 'Dendi F.' }
  });

  if (!dendi) {
    console.log('Dendi F not found');
    return;
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: dendi.id }
  });

  console.log('Candidate:', dendi.name);
  console.log('Experience Years:', profile?.experienceYears);
  console.log('Resume Preview:', profile?.resumeText?.substring(0, 100));
}

check().finally(() => prisma.$disconnect());
