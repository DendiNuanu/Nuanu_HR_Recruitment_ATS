import { prisma } from "@/lib/prisma";
import ScreeningClient, { AssessmentData } from "./ScreeningClient";

export default async function ScreeningPage() {
  const [templates, assessmentsDb, allAssessments, applicationsDb] =
    await Promise.all([
      prisma.assessmentTemplate.findMany(),
      prisma.assessment.groupBy({
        by: ["title"],
        _count: { applicationId: true },
        _avg: { score: true },
      }),
      prisma.assessment.findMany({
        include: {
          application: {
            include: {
              candidate: true,
              vacancy: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.application.findMany({
        where: { status: { notIn: ["rejected", "hired"] } },
        include: { candidate: true, vacancy: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const assessmentTemplates: AssessmentData[] = templates.map((t) => {
    const agg = assessmentsDb.find((a) => a.title === t.title);
    return {
      id: t.id,
      title: t.title,
      type: t.type,
      duration: t.duration ? `${t.duration} mins` : "Untimed",
      candidates: agg?._count.applicationId || 0,
      avgScore: agg?._avg.score ? Math.round(agg._avg.score) : 0,
      status: t.isActive ? "Active" : "Draft",
    };
  });

  const recentAssessments = allAssessments.map((a) => ({
    id: a.id,
    candidateName: a.application.candidate.name,
    vacancyTitle: a.application.vacancy.title,
    title: a.title,
    type: a.type,
    status: a.status,
    score: a.score,
    maxScore: a.maxScore ?? 100,
    passThreshold: a.passThreshold ?? 70,
    isPassed: a.isPassed,
    description: a.description ?? "",
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  const assessmentTemplatesForClient = templates.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    description: t.description ?? "",
    duration: t.duration ?? 60,
    passThreshold: t.passThreshold ?? 70,
    isActive: t.isActive,
    candidates:
      assessmentsDb.find((a) => a.title === t.title)?._count.applicationId ?? 0,
    avgScore: assessmentsDb.find((a) => a.title === t.title)?._avg.score
      ? Math.round(assessmentsDb.find((a) => a.title === t.title)!._avg.score!)
      : 0,
  }));

  const stats = {
    totalSent: allAssessments.length,
    pending: allAssessments.filter((a) => a.status === "pending").length,
    completed: allAssessments.filter((a) => a.status === "completed").length,
    avgScore:
      allAssessments.length > 0
        ? Math.round(
            allAssessments.reduce((acc, curr) => acc + (curr.score || 0), 0) /
              allAssessments.length,
          )
        : 0,
  };

  const activeApplications = applicationsDb.map((app) => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title,
  }));

  return (
    <ScreeningClient
      templates={assessmentTemplates}
      recentAssessments={recentAssessments}
      activeApplications={activeApplications}
      stats={stats}
    />
  );
}
