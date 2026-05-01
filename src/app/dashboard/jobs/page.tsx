import { prisma } from "@/lib/prisma";
import { Plus, Search, Filter, Briefcase, Users, Eye, Edit, MoreVertical } from "lucide-react";
import Link from "next/link";
import JobCard from "./JobCard";

export default async function JobsPage() {
  const vacancies = await prisma.vacancy.findMany({
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
  });

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

      <div className="card">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400" />
            <input 
              type="text" 
              placeholder="Search jobs..." 
              className="w-full pl-10 pr-4 py-2 bg-nuanu-gray-50 border border-nuanu-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="btn-secondary px-3 py-2 text-sm flex-1 sm:flex-none justify-center">
              All Departments <Filter className="w-3.5 h-3.5 ml-1" />
            </button>
            <button className="btn-secondary px-3 py-2 text-sm flex-1 sm:flex-none justify-center">
              All Statuses <Filter className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {vacancies.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-nuanu-navy">No vacancies found</h3>
            <p className="text-nuanu-gray-500 mt-1">Click the button above to create your first job requisition.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vacancies.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
