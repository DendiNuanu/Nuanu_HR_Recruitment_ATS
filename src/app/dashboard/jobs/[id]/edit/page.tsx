import { prisma } from "@/lib/prisma";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateVacancy } from "@/app/actions/jobs";
import DepartmentCombobox from "../../create/DepartmentCombobox";

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: { department: true }
  });

  if (!vacancy) {
    notFound();
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" }
  });

  const updateVacancyWithId = updateVacancy.bind(null, id);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs" className="p-2 bg-white border border-nuanu-gray-200 rounded-lg hover:bg-nuanu-gray-50 text-nuanu-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Edit Vacancy</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Updating: <span className="font-semibold text-emerald-600">{vacancy.title}</span> ({vacancy.code})</p>
        </div>
      </div>

      <form action={updateVacancyWithId} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Job Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Job Title <span className="text-red-500">*</span></label>
                <input 
                  required 
                  name="title" 
                  type="text" 
                  defaultValue={vacancy.title}
                  className="input-field" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
                <DepartmentCombobox 
                  departments={departments} 
                  initialName={vacancy.department.name}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Location <span className="text-red-500">*</span></label>
                <input 
                  required 
                  name="location" 
                  type="text" 
                  defaultValue={vacancy.location}
                  className="input-field" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Employment Type <span className="text-red-500">*</span></label>
                <select required name="employmentType" defaultValue={vacancy.employmentType} className="input-field">
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Headcount <span className="text-red-500">*</span></label>
                <input 
                  required 
                  name="headcount" 
                  type="number" 
                  min="1" 
                  defaultValue={vacancy.headcount} 
                  className="input-field" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Status</label>
                <select name="status" defaultValue={vacancy.status} className="input-field">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Job Description</h2>
            
            <div>
              <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">About the Role <span className="text-red-500">*</span></label>
              <textarea 
                required 
                name="description" 
                rows={8} 
                defaultValue={vacancy.description}
                className="input-field"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Requirements & Skills <span className="text-red-500">*</span></label>
              <textarea 
                required 
                name="requirements" 
                rows={8} 
                defaultValue={vacancy.requirements}
                className="input-field"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Save Changes</h2>
            
            <p className="text-xs text-nuanu-gray-500">
              Last updated: {vacancy.updatedAt.toLocaleString()}
            </p>

            <div className="pt-4 border-t border-nuanu-gray-100 space-y-3">
              <button type="submit" className="w-full btn-primary py-3 justify-center text-sm font-bold shadow-lg shadow-emerald-500/20">
                <Save className="w-4 h-4" /> Update Vacancy
              </button>
              <Link href="/dashboard/jobs" className="w-full btn-secondary py-3 justify-center text-sm">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
