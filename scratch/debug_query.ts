import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const applications = await prisma.application.findMany({
    where: {
      candidateScore: {
        overallScore: { gte: 80 }
      }
    },
    include: {
      candidate: true,
      vacancy: true,
      candidateScore: true
    },
    orderBy: {
      candidateScore: { overallScore: 'desc' }
    },
    take: 3
  });

  console.log('Found applications:', applications.length);
  applications.forEach(app => {
    console.log(`- ${app.candidate.name}: Score ${app.candidateScore?.overallScore}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
