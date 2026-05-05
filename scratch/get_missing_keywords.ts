import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const scores = await prisma.candidateScore.findMany({
    include: {
      application: {
        include: {
          vacancy: true,
        },
      },
    },
  });

  const alerts = scores.map(s => ({
    vacancy: s.application.vacancy.title,
    missingKeywords: s.missingKeywords,
  }));

  console.log(JSON.stringify(alerts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
