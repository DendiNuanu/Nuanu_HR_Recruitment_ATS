import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import PipelineBoard from "./PipelineBoard";

const getCachedPipelineData = unstable_cache(
  async () => {
    const vacancies = await prisma.vacancy.findMany({
      orderBy: { createdAt: "desc" },
    });

    const applications = await prisma.application.findMany({
      include: {
        candidate: true,
        vacancy: true,
        candidateScore: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group applications by stage for the initial pipeline state
    // We need to group them first by vacancy, but the PipelineBoard handles vacancy selection.
    // Actually, PipelineBoard expects all candidates grouped by stage, and it currently filters by selectedVacancy.
    // Let's format all applications into the PipelineStore format:
    // Record<string, any[]>
    const formattedCandidates: Record<string, any[]> = {
      applied: [],
      screening: [],
      hr_interview: [],
      user_interview: [],
      final_interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };

    applications.forEach((app) => {
      const stage = app.currentStage.toLowerCase();
      if (formattedCandidates[stage]) {
        formattedCandidates[stage].push({
          id: app.candidateId, // Pipeline store uses this as draggableId
          applicationId: app.id,
          name: app.candidate.name,
          position: app.vacancy.title,
          vacancyId: app.vacancyId,
          score: app.candidateScore?.overallScore ?? 0,
          appliedAt: app.appliedAt.toISOString(),
          stage: stage,
          tags:
            app.candidateScore?.overallScore &&
            app.candidateScore.overallScore >= 80
              ? ["top_candidate"]
              : [],
        });
      } else {
        // If the stage is something else, put it in applied by default
        formattedCandidates["applied"].push({
          id: app.candidateId,
          applicationId: app.id,
          name: app.candidate.name,
          position: app.vacancy.title,
          vacancyId: app.vacancyId,
          score: app.candidateScore?.overallScore ?? 0,
          appliedAt: app.appliedAt.toISOString(),
          stage: "applied",
          tags: [],
        });
      }
    });

    return { formattedCandidates, vacancies };
  },
  ["pipeline-page-data"],
  { revalidate: 60, tags: ["applications", "vacancies"] },
);

export default async function PipelinePage() {
  const { formattedCandidates, vacancies } = await getCachedPipelineData();

  return (
    <PipelineBoard
      initialCandidates={formattedCandidates}
      vacancies={vacancies}
    />
  );
}
