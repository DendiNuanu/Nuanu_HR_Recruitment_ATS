import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import CandidatesTable from "./CandidatesTable";
import ExportButton from "./ExportButton";
import UploadCVButton from "./UploadCVButton";
const getCachedCandidatesData = unstable_cache(
  async () => {
    // Pull real applications from the database
    const applications = await prisma.application.findMany({
      take: 200,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true,
            department: { select: { name: true } },
          },
        },
        candidateScore: {
          select: {
            overallScore: true,
            recommendations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map DB records to a flat shape for the client component
    const candidateIds = applications.map((a) => a.candidateId);
    const profiles =
      candidateIds.length > 0
        ? await prisma.candidateProfile.findMany({
            where: { userId: { in: candidateIds } },
            select: {
              userId: true,
              experienceYears: true,
              skills: true,
              resumeUrl: true,
              domicile: true,
              referPosition: true,
            },
          })
        : [];
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const candidates = applications.map((app) => {
      const profile = profileByUserId.get(app.candidateId);
      return {
        id: app.id,
        userId: app.candidateId,
        name: app.candidate.name,
        email: app.candidate.email,
        vacancyTitle: app.vacancy.title,
        stage: app.currentStage,
        score: app.candidateScore?.overallScore ?? 0,
        experienceYears: profile?.experienceYears ?? 0,
        location: app.vacancy.location ?? "Remote",
        appliedAt: app.appliedAt.toISOString(),
        phone: app.candidate.phone ?? undefined,
        skills: profile?.skills ?? ["Communication", "Problem Solving"],
        coverLetter: app.coverLetter ?? undefined,
        resumeUrl: profile?.resumeUrl ?? undefined,
        source: app.source ?? "direct",
        domicile: profile?.domicile ?? undefined,
        referPosition: profile?.referPosition ?? undefined,
        emailSentAt: (app as any).emailSentAt ? new Date((app as any).emailSentAt).toISOString() : undefined,
        emailSentSubject: (app as any).emailSentSubject ?? undefined,
        recommendations: Array.isArray(app.candidateScore?.recommendations)
          ? app.candidateScore.recommendations
          : [],
        notes: [],
        interviewComments: [],
      };
    });

    return candidates;
  },
  ["candidates-page-data"],
  { revalidate: 120, tags: ["applications", "candidates"] },
);

export default async function CandidatesPage() {
  const [candidates, vacancies] = await Promise.all([
    getCachedCandidatesData(),
    prisma.vacancy.findMany({
      where: { status: { in: ["published", "approved"] } },
      select: { id: true, title: true, status: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Candidates</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">
            Manage and evaluate all applicants
          </p>
        </div>
        <div className="flex gap-3">
          <UploadCVButton vacancies={vacancies} />
          <ExportButton candidates={candidates} />
        </div>
      </div>

      <CandidatesTable candidates={candidates} />
    </div>
  );
}
