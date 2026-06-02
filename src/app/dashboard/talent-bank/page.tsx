import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import CandidatesTable from "../candidates/CandidatesTable";

export const dynamic = "force-dynamic";

const LIST_TAKE = 500;

async function fetchTalentBankCandidates() {
  const applications = await prisma.application.findMany({
    where: { deletedAt: null, currentStage: "talent_bank" },
    take: LIST_TAKE,
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
      location:
        profile?.domicile?.trim() ||
        profile?.location?.trim() ||
        app.vacancy.location ||
        "—",
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

const getCachedTalentBankCandidates = unstable_cache(
  fetchTalentBankCandidates,
  ["talent-bank-candidates"],
  { revalidate: 30, tags: ["applications", "candidates"] },
);

export default async function TalentBankPage() {
  const candidates = await getCachedTalentBankCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nuanu-navy">Talent Bank</h1>
        <p className="text-sm text-nuanu-gray-500 mt-1">
          Curated candidates intentionally moved into the talent bank.
        </p>
      </div>

      <CandidatesTable candidates={candidates} />
    </div>
  );
}
