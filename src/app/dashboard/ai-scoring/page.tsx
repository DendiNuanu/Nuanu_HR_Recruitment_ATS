import { prisma } from "@/lib/prisma";
import AIScoringClient, { TopMatch } from "./AIScoringClient";

export default async function AIScoringPage() {
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

  const topMatches: TopMatch[] = applications.map(app => {
    // If we have a candidate profile, we could pull more real details, but we will fallback gracefully
    return {
      id: app.id,
      name: app.candidate.name,
      score: app.candidateScore?.overallScore || 0,
      currentTitle: "Candidate", // Mock fallback if candidate profile is missing
      currentCompany: "Unknown", // Mock fallback
      skills: app.candidateScore?.matchedKeywords || ["General Skills"],
      experienceYears: 0, // Mock fallback
      vacancyTitle: app.vacancy.title,
    };
  });

  return <AIScoringClient topMatches={topMatches} />;
}
