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
    DENI (Dendi F.)
    Commercial Leasing Executive | Real Estate & Business Development Specialist
    
    PROFESSIONAL SUMMARY
    Results-driven professional with over 10+ years of experience in commercial leasing, contract negotiation, and business development. Proven track record in managing complex leasing agreements, tenant relationships, and high-value strategic partnerships within real estate and lifestyle sectors.
    
    CORE SKILLS
    - Expert-Level Contract Drafting & Negotiation
    - Strategic Commercial Leasing & Tenant Acquisition
    - High-Level Stakeholder Management
    - Advanced Legal Compliance & Risk Mitigation
    - Enterprise CRM & ATS Systems Design
    
    PROFESSIONAL EXPERIENCE
    Commercial & Business Development Specialist (10+ Years Experience)
    - Managed full leasing lifecycle from prospecting to contract execution.
    - Successfully increased occupancy rate and revenue optimization.
  `;

  const jhonResume = `
    Jhon Doe
    Hospitality Professional / Host.
    5 years of experience in high-end restaurant and hotel environments.
    Expert in guest relations, reservation management systems, and team coordination.
    Skills: Guest Service, POS Systems, Multi-lingual (English, Indonesian), Conflict Resolution.
    Education: Diploma in Tourism and Hospitality.
  `;

  for (const app of applications) {
    let resumeText = '';
    let expYears = 0;
    if (app.candidate.name === 'Dendi F.') {
      resumeText = dendiResume;
      expYears = 10;
    } else if (app.candidate.name === 'Jhon Doe') {
      resumeText = jhonResume;
      expYears = 5;
    }

    if (resumeText) {
      await prisma.candidateProfile.upsert({
        where: { userId: app.candidateId },
        update: { 
          resumeText,
          experienceYears: expYears,
          currentTitle: app.candidate.name === 'Dendi F' ? 'Commercial Leasing Executive' : 'Lead Host'
        },
        create: {
          userId: app.candidateId,
          resumeText,
          experienceYears: expYears,
          currentTitle: app.candidate.name === 'Dendi F' ? 'Commercial Leasing Executive' : 'Lead Host',
          skills: app.candidate.name === 'Dendi F' ? ['Lease Negotiation', 'CRM', 'Contract Drafting'] : ['Guest Service', 'POS'],
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
