import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      vacancy: true,
    },
  });

  const dendiResume = `
    Dendi F.
    Commercial Leasing Executive with 5 years of experience in real estate.
    Experienced in negotiating high-value commercial leases, managing tenant relations, and market analysis.
    Key Skills: Lease Negotiation, Real Estate Law, CRM, Market Research, Financial Analysis.
    Education: Bachelor of Business Administration.
    Previous Role: Senior Leasing Agent at Prime Properties.
    Successfully increased occupancy rate by 20% in the last fiscal year.
  `;

  const jhonResume = `
    Jhon Doe
    Hospitality Professional / Host.
    3 years of experience in high-end restaurant and hotel environments.
    Expert in guest relations, reservation management systems, and team coordination.
    Skills: Guest Service, POS Systems, Multi-lingual (English, Indonesian), Conflict Resolution.
    Education: Diploma in Tourism and Hospitality.
    Previous Role: Lead Host at Grand Plaza Hotel.
    Consistently rated 5/5 for customer service excellence.
  `;

  for (const app of applications) {
    let resumeText = '';
    if (app.candidate.name === 'Dendi F') {
      resumeText = dendiResume;
    } else if (app.candidate.name === 'Jhon Doe') {
      resumeText = jhonResume;
    }

    if (resumeText) {
      await prisma.candidateProfile.upsert({
        where: { userId: app.candidateId },
        update: { resumeText },
        create: {
          userId: app.candidateId,
          resumeText,
          skills: app.candidate.name === 'Dendi F' ? ['Lease Negotiation', 'CRM'] : ['Guest Service', 'POS'],
        },
      });
      console.log(`Updated resume for ${app.candidate.name}`);
      
      // Delete existing score to allow re-scanning
      await prisma.candidateScore.deleteMany({
        where: { applicationId: app.id }
      });
      console.log(`Deleted existing score for ${app.candidate.name} to allow re-scan`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
