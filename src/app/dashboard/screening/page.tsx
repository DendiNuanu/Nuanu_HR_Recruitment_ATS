import { prisma } from "@/lib/prisma";
import ScreeningClient, { AssessmentData } from "./ScreeningClient";

export default async function ScreeningPage() {
  const templates = await prisma.assessmentTemplate.findMany();
  
  const assessmentsDb = await prisma.assessment.groupBy({
    by: ['title'],
    _count: { applicationId: true },
    _avg: { score: true }
  });

  const assessments: AssessmentData[] = templates.map(t => {
    const agg = assessmentsDb.find(a => a.title === t.title);
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      duration: t.duration ? `${t.duration} mins` : "Untimed",
      candidates: agg?._count.applicationId || 0,
      avgScore: agg?._avg.score ? Math.round(agg._avg.score) : 0,
      status: t.isActive ? "Active" : "Draft"
    };
  });

  // If no templates in DB, provide empty array gracefully
  return <ScreeningClient assessments={assessments} />;
}
