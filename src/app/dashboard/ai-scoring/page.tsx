import { prisma } from "@/lib/prisma";
import AIScoringClient, { TopMatch } from "./AIScoringClient";

export type MissingKeywordAlert = {
  vacancyTitle: string;
  keywords: string[];
};

export default async function AIScoringPage() {
  const applications = await prisma.application.findMany({
    where: {
      candidateScore: {
        isNot: null
      }
    },
    include: {
      candidate: {
        include: {
          activityLogs: false,
        }
      },
      vacancy: true,
      candidateScore: true
    },
    orderBy: {
      candidateScore: { overallScore: 'desc' }
    }
  });

  // Calculate missing keyword alerts
  const vacancyAlertsMap = new Map<string, Set<string>>();
  
  applications.forEach(app => {
    if (app.candidateScore?.missingKeywords && app.candidateScore.missingKeywords.length > 0) {
      const title = app.vacancy.title;
      if (!vacancyAlertsMap.has(title)) {
        vacancyAlertsMap.set(title, new Set());
      }
      app.candidateScore.missingKeywords.forEach(kw => {
        vacancyAlertsMap.get(title)?.add(kw);
      });
    }
  });

  const missingKeywordAlerts: MissingKeywordAlert[] = Array.from(vacancyAlertsMap.entries()).map(([vacancyTitle, keywordSet]) => ({
    vacancyTitle,
    keywords: Array.from(keywordSet).slice(0, 3) // Just show top 3 missing keywords
  }));

  // Fetch profiles for these candidates to get real titles/experience
  const candidateIds = applications.map(app => app.candidateId);
  const profiles = await prisma.candidateProfile.findMany({
    where: {
      userId: { in: candidateIds }
    }
  });

  const profileMap = new Map(profiles.map(p => [p.userId, p]));

  const topMatches: TopMatch[] = applications.map(app => {
    const profile = profileMap.get(app.candidateId);
    return {
      id: app.id,
      name: app.candidate.name,
      score: app.candidateScore?.overallScore || 0,
      currentTitle: profile?.currentTitle || "Candidate",
      currentCompany: profile?.currentCompany || "Previous Experience",
      skills: app.candidateScore?.matchedKeywords && app.candidateScore.matchedKeywords.length > 0 
        ? app.candidateScore.matchedKeywords 
        : (profile?.skills || ["General Skills"]),
      experienceYears: profile?.experienceYears || 0,
      vacancyTitle: app.vacancy.title,
    };
  });

  const vacancies = Array.from(new Set(applications.map(app => app.vacancy.title))).sort();

  return (
    <AIScoringClient 
      topMatches={topMatches} 
      missingKeywordAlerts={missingKeywordAlerts} 
      vacancies={vacancies}
    />
  );
}
