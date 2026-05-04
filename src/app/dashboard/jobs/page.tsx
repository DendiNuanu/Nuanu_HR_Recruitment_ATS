import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import Link from "next/link";
import JobsClient from "./JobsClient";

export default async function JobsPage() {
  const [vacancies, departments] = await Promise.all([
    prisma.vacancy.findMany({
      include: {
        department: true,
        _count: {
          select: { applications: true }
        },
        applications: {
          where: { currentStage: "hired" },
          select: { id: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" }
    })
  ]);

  // Data Synchronization: Ensure filledCount matches actual hired applications
  for (const vacancy of vacancies) {
    const actualHiredCount = vacancy.applications.length;
    if (vacancy.filledCount !== actualHiredCount) {
      await prisma.vacancy.update({
        where: { id: vacancy.id },
        data: { filledCount: actualHiredCount }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Job Requisitions</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Manage open positions and hiring requests</p>
        </div>
        <Link href="/dashboard/jobs/create" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Vacancy
        </Link>
      </div>

      <JobsClient initialVacancies={vacancies} departments={departments} />
    </div>
  );
}
