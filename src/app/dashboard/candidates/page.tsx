import { prisma } from "@/lib/prisma";
import { Search, Filter, Eye, Download, Mail, MoreVertical, Users } from "lucide-react";
import CandidatesTable from "./CandidatesTable";

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
  const candidates = applications.map(app => ({
    id: app.id,
    name: app.candidate.name,
    email: app.candidate.email,
    vacancyTitle: app.vacancy.title,
    stage: app.currentStage,
    score: app.candidateScore?.overallScore ?? 0,
    experienceYears: 0,
    location: app.vacancy.location ?? "Remote",
    appliedAt: app.appliedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Candidates</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage and evaluate all applicants</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <CandidatesTable candidates={candidates} />
    </div>
  );
}
