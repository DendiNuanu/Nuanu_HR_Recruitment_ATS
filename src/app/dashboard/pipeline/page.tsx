import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import PipelineBoard from "./PipelineBoard";
import { PIPELINE_STAGES, resolvePipelineColumn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

    // Build stage map from the canonical PIPELINE_STAGES list so we never miss a stage
    const formattedCandidates: Record<string, any[]> = {};
    for (const s of PIPELINE_STAGES) {
      formattedCandidates[s.id] = [];
    }
    applications.forEach((app) => {
      const columnId = resolvePipelineColumn(app.currentStage);
      formattedCandidates[columnId].push({
        id: app.id,
        applicationId: app.id,
        name: app.candidate.name,
        position: app.vacancy.title,
        vacancyId: app.vacancyId,
        score: app.candidateScore?.overallScore ?? 0,
        appliedAt: app.appliedAt.toISOString(),
        stage: columnId,
        tags:
          app.candidateScore?.overallScore &&
          app.candidateScore.overallScore >= 80
            ? ["top_candidate"]
            : [],
      });
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
