import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assessments = await prisma.assessment.findMany({
    include: {
      application: {
        include: {
          candidate: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  console.log('Recent Assessments:');
  assessments.forEach((a) => {
    console.log(`ID: ${a.id}`);
    console.log(`Title: ${a.title}`);
    console.log(`Candidate: ${a.application.candidate.name}`);
    console.log(`Status: ${a.status}`);
    console.log(`Created At: ${a.createdAt}`);
    console.log('---');
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
