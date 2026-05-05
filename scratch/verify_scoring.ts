import { scanResumes } from '../src/app/dashboard/ai-scoring/actions';
import { prisma } from '../src/lib/prisma';

async function verify() {
  console.log('Starting scan...');
  const result = await scanResumes();
  console.log('Scan result:', result);

  if (result.success) {
    const scores = await prisma.candidateScore.findMany({
      include: {
        application: {
          include: {
            candidate: true
          }
        }
      }
    });

    console.log('\n--- SCORING RESULTS ---');
    scores.forEach(s => {
      console.log(`Candidate: ${s.application.candidate.name}`);
      console.log(`Hard Skills: ${s.hardSkillsScore}`);
      console.log(`Experience: ${s.experienceScore}`);
      console.log(`Soft Skills: ${s.softSkillsScore}`);
      console.log(`Education: ${s.educationScore}`);
      console.log(`Format: ${s.formatScore}`);
      console.log(`OVERALL: ${s.overallScore}`);
      
      const expected = Math.round(
        (s.hardSkillsScore * 0.40) + 
        (s.experienceScore * 0.25) + 
        (s.softSkillsScore * 0.15) + 
        (s.educationScore * 0.10) + 
        (s.formatScore * 0.10)
      );
      
      console.log(`Expected Weighted: ${expected}`);
      console.log(`Match: ${s.overallScore === expected ? '✅ PASS' : '❌ FAIL'}`);
      console.log('------------------------');
    });
  }
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
