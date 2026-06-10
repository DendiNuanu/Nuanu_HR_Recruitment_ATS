import { prisma } from "@/lib/prisma";
import CandidatesTable from "./CandidatesTable";
import ExportButton from "./ExportButton";
import UploadCVButton from "./UploadCVButton";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Fetch the full list of active applications. We do NOT cap the result set
 * with a hard `take` limit because that silently hides older candidates from
 * the list and from client-side search — Ikhsan Maulana (applied 2026-05-13)
 * dropped off the page once total active applications crossed 500. The
 * frontend paginates the view in 50-row pages, so loading all rows from the
 * DB is fine for the current scale. If the table grows past a few thousand
 * rows, switch to cursor-based pagination driven by URL params.
 *
 * Optional `?search=...` runs the filter server-side using a Postgres
 * case-insensitive `ILIKE` against name/email/vacancy, so search always sees
 * the full database even when the in-memory list would otherwise be capped.
 */
async function fetchCandidatesList(searchTerm: string) {
  const trimmedSearch = searchTerm.trim();
  const where: Record<string, unknown> = { deletedAt: null };

  if (trimmedSearch) {
    where.OR = [
      { candidate: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      {
        candidate: { email: { contains: trimmedSearch, mode: "insensitive" } },
      },
      { vacancy: { title: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  const applications = await prisma.application.findMany({
    where,
    select: {
      id: true,
      candidateId: true,
      currentStage: true,
      appliedAt: true,
      createdAt: true,
      lastActivityAt: true,
      source: true,
      coverLetter: true,
      emailSentAt: true,
      emailSentSubject: true,
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
    orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
  });

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
            location: true,
            referPosition: true,
            salaryExpectation: true,
          },
        })
      : [];
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

  return applications.map((app) => {
    const profile = profileByUserId.get(app.candidateId);
    return {
      id: app.id,
      userId: app.candidateId,
      name: app.candidate.name,
      email: app.candidate.email,
      vacancyTitle: profile?.referPosition ?? app.vacancy.title,
      stage: app.currentStage,
      score: app.candidateScore?.overallScore ?? 0,
      experienceYears: profile?.experienceYears ?? 0,
      // Never fall back to vacancy.location — that is the job's location
      // (e.g. "On site") not the candidate's home city.
      location: profile?.domicile?.trim() || profile?.location?.trim() || "—",
      appliedAt: app.appliedAt.toISOString(),
      createdAt: app.createdAt.toISOString(),
      lastActivityAt: app.lastActivityAt.toISOString(),
      phone: app.candidate.phone ?? undefined,
      skills: profile?.skills ?? ["Communication", "Problem Solving"],
      coverLetter: app.coverLetter ?? undefined,
      resumeUrl: profile?.resumeUrl ?? undefined,
      source: app.source ?? "direct",
      domicile: profile?.domicile ?? undefined,
      referPosition: profile?.referPosition ?? undefined,
      salaryExpectation: profile?.salaryExpectation ?? undefined,
      emailSentAt: app.emailSentAt
        ? new Date(app.emailSentAt).toISOString()
        : undefined,
      emailSentSubject: app.emailSentSubject ?? undefined,
      recommendations: Array.isArray(app.candidateScore?.recommendations)
        ? app.candidateScore.recommendations
        : [],
      notes: [],
      interviewComments: [],
    };
  });
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = pickString(searchParams.search) ?? "";

  const [candidates, vacancies] = await Promise.all([
    fetchCandidatesList(search),
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

      <CandidatesTable candidates={candidates} initialSearch={search} />
    </div>
  );
}
