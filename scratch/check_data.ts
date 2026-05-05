import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      candidateScore: true,
      vacancy: true,
    },
  });

  console.log('Applications:');
  applications.forEach((app) => {
    console.log(`ID: ${app.id}`);
    console.log(`Candidate: ${app.candidate.name}`);
    console.log(`Vacancy: ${app.vacancy.title}`);
    console.log(`Status: ${app.status}`);
    console.log(`Score: ${app.candidateScore ? app.candidateScore.overallScore : 'None'}`);
    console.log('---');
  });

  const profiles = await prisma.candidateProfile.findMany();
  console.log('\nCandidate Profiles:');
  profiles.forEach((profile) => {
    console.log(`User ID: ${profile.userId}`);
    console.log(`Resume Text Length: ${profile.resumeText?.length || 0}`);
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
