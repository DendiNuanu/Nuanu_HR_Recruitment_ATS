import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import CandidatesTable from "./CandidatesTable";
import ExportButton from "./ExportButton";
import UploadCVButton from "./UploadCVButton";
const getCachedCandidatesData = unstable_cache(
  async () => {
    // Pull real applications from the database
    const applications = await prisma.application.findMany({
      include: {
        candidate: true,
        vacancy: {
          include: { department: true },
        },
        candidateScore: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Map DB records to a flat shape for the client component
    const candidateIds = applications.map((a) => a.candidateId);
    const profiles = await prisma.candidateProfile.findMany({
      where: { userId: { in: candidateIds } },
    });

    // Fetch notes and custom fields for all applications
    // Handle case where tables don't exist yet
    let notesAll: any[] = [];
    let customFieldsAll: any[] = [];
    try {
      const [notes, fields] = await Promise.all([
        prisma.candidateNote.findMany({
          where: { applicationId: { in: applications.map((a) => a.id) } },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.applicationCustomField.findMany({
          where: { applicationId: { in: applications.map((a) => a.id) } },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      notesAll = notes;
      customFieldsAll = fields;
    } catch (error) {
      // Tables don't exist yet - that's okay, we'll show empty state
      console.warn("Notes or custom fields tables not found:", error);
    }

    const candidates = applications.map((app) => {
      const profile = profiles.find((p) => p.userId === app.candidateId);
      return {
        id: app.id,
        userId: app.candidateId, // Add the actual User ID
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
        resumeText: profile?.resumeText ?? undefined,
        notes: notesAll
          .filter((n) => n.applicationId === app.id)
          .map((n) => ({
            id: n.id,
            content: n.content,
            authorName: n.author.name,
            authorId: n.authorId,
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString(),
          })),
        customFields: customFieldsAll
          .filter((f) => f.applicationId === app.id)
          .map((f) => ({
            id: f.id,
            fieldName: f.fieldName,
            fieldValue: f.fieldValue,
            createdAt: f.createdAt.toISOString(),
          })),
      };
    });

    return candidates;
  },
  ["candidates-page-data"],
  { revalidate: 60, tags: ["applications", "candidates"] },
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
