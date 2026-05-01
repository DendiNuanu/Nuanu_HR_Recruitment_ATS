import { prisma } from "@/lib/prisma";
import { Search, Filter, Eye, Download, Mail, MoreVertical, Users } from "lucide-react";
import CandidatesTable from "./CandidatesTable";
import ExportButton from "./ExportButton";

export default async function CandidatesPage() {
  // Pull real applications from the database
  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      vacancy: {
        include: { department: true }
      },
      candidateScore: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Map DB records to a flat shape for the client component
  const candidateIds = applications.map(a => a.candidateId);
  const profiles = await prisma.candidateProfile.findMany({
    where: { userId: { in: candidateIds } }
  });

  const candidates: Candidate[] = applications.map(app => {
    const profile = profiles.find(p => p.userId === app.candidateId);
    return {
      id: app.id,
      name: app.candidate.name,
      email: app.candidate.email,
      vacancyTitle: app.vacancy.title,
      stage: app.currentStage,
      score: app.candidateScore?.overallScore ?? 0,
      experienceYears: profile?.experienceYears ?? 0,
      location: app.vacancy.location ?? "Remote",
      appliedAt: app.appliedAt.toISOString(),
      skills: profile?.skills ?? ["Communication", "Problem Solving"],
      coverLetter: app.coverLetter ?? undefined,
      resumeUrl: profile?.resumeUrl ?? undefined,
      resumeText: profile?.resumeText ?? undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Candidates</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage and evaluate all applicants</p>
        </div>
        <div className="flex gap-3">
          <ExportButton candidates={candidates} />
        </div>
      </div>

      <CandidatesTable candidates={candidates} />
    </div>
  );
}
