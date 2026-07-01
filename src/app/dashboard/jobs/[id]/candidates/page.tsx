import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import CandidatesTable from "@/app/dashboard/candidates/CandidatesTable";

export const dynamic = "force-dynamic";

async function getVacancyCandidates(vacancyId: string) {
  const [vacancy, applications] = await Promise.all([
    prisma.vacancy.findFirst({
      where: { id: vacancyId, deletedAt: null },
      select: { id: true, title: true, code: true },
    }),
    prisma.application.findMany({
      where: { vacancyId, deletedAt: null },
      select: {
        id: true,
        candidateId: true,
        currentStage: true,
        appliedAt: true,
        createdAt: true,
        lastActivityAt: true,
        source: true,
        appliedFor: true,
        candidate: {
          select: { id: true, name: true, email: true, phone: true },
        },
        vacancy: {
          select: { id: true, title: true, location: true },
        },
        candidateScore: {
          select: { overallScore: true, recommendations: true },
        },
      },
      orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!vacancy) return null;

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
            location: true,
            domicile: true,
            willingToRelocate: true,
            referPosition: true,
            salaryExpectation: true,
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
      vacancyTitle: app.appliedFor ?? vacancy.title,
      appliedFor: app.appliedFor ?? null,
      stage: app.currentStage,
      score: app.candidateScore?.overallScore ?? 0,
      experienceYears: profile?.experienceYears ?? 0,
      // Never fall back to vacancy.location — that is the job's location
      // (e.g. "On site") not the candidate's home city.
      location:
        profile?.domicile?.trim() ||
        profile?.location?.trim() ||
        "\u2014",
      domicile: profile?.domicile ?? undefined,
      willingToRelocate: profile?.willingToRelocate ?? false,
      appliedAt: app.appliedAt.toISOString(),
      createdAt: app.createdAt.toISOString(),
      lastActivityAt: app.lastActivityAt.toISOString(),
      phone: app.candidate.phone ?? undefined,
      skills: profile?.skills ?? [],
      resumeUrl: profile?.resumeUrl ?? undefined,
      source: app.source ?? "direct",
      referPosition: profile?.referPosition ?? undefined,
      salaryExpectation: profile?.salaryExpectation ?? undefined,
      recommendations: Array.isArray(app.candidateScore?.recommendations)
        ? app.candidateScore.recommendations
        : [],
      notes: [],
      interviewComments: [],
    };
  });

  return { vacancy, candidates };
}

function getCachedVacancyCandidates(vacancyId: string) {
  return unstable_cache(
    () => getVacancyCandidates(vacancyId),
    ["vacancy-candidates", vacancyId],
    { revalidate: 30, tags: ["applications", "candidates"] },
  )();
}

export default async function VacancyCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCachedVacancyCandidates(id);

  if (!result) {
    notFound();
  }

  const { vacancy, candidates } = result;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-nuanu-gray-500 flex-wrap">
        <Link
          href="/dashboard"
          className="hover:text-nuanu-emerald transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          href="/dashboard/jobs"
          className="hover:text-nuanu-emerald transition-colors"
        >
          Jobs
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-nuanu-navy font-medium">{vacancy.title}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-nuanu-emerald font-semibold">Candidates</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-nuanu-navy">{vacancy.title}</h1>
        <p className="text-sm text-nuanu-gray-500 mt-1">
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"} for
          this vacancy
          {vacancy.code ? ` · ${vacancy.code}` : ""}
        </p>
      </div>

      <CandidatesTable candidates={candidates} vacancyTitle={vacancy.title} />
    </div>
  );
}
