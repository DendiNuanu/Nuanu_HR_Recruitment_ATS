import { prisma } from "@/lib/prisma";
import { ArrowLeft, Save, Webhook, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { createVacancy } from "@/app/actions/jobs";
import DepartmentCombobox from "./DepartmentCombobox";


export default async function CreateVacancyPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs" className="p-2 bg-white border border-nuanu-gray-200 rounded-lg hover:bg-nuanu-gray-50 text-nuanu-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-nuanu-navy">Create Vacancy</h1>
          <p className="text-sm text-nuanu-gray-500 mt-1">Draft a new job requisition and publish to job boards</p>
        </div>
      </div>

      <form action={createVacancy} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Job Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Job Title <span className="text-red-500">*</span></label>
                <input required name="title" type="text" placeholder="e.g. Senior Frontend Engineer" className="input-field" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
                <DepartmentCombobox departments={departments} />
              </div>


              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Location <span className="text-red-500">*</span></label>
                <input required name="location" type="text" placeholder="e.g. Remote, On-site (Bali)" className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Employment Type <span className="text-red-500">*</span></label>
                <select required name="employmentType" className="input-field">
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Headcount <span className="text-red-500">*</span></label>
                <input required name="headcount" type="number" min="1" defaultValue="1" className="input-field" />
              </div>
            </div>
          </div>

          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Job Description</h2>
            
            <div>
              <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">About the Role <span className="text-red-500">*</span></label>
              <textarea required name="description" rows={6} className="input-field" placeholder="Describe the day-to-day responsibilities..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-nuanu-gray-700 mb-1.5">Requirements & Skills <span className="text-red-500">*</span></label>
              <textarea required name="requirements" rows={6} className="input-field" placeholder="- 5+ years of experience with React..."></textarea>
            </div>
          </div>
        </div>

        {/* Right Column: Publishing & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-nuanu-navy border-b border-nuanu-gray-100 pb-4">Publishing</h2>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 bg-nuanu-gray-50 rounded-lg border border-nuanu-gray-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                <input type="checkbox" name="publishCareers" defaultChecked className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-bold text-nuanu-navy flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-emerald-500" /> Nuanu Careers Page</p>
                  <p className="text-xs text-nuanu-gray-500 mt-1">Publish instantly to your public job board.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-nuanu-gray-50 rounded-lg border border-nuanu-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                <input type="checkbox" name="publishLinkedIn" className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-bold text-nuanu-navy flex items-center gap-2"><Webhook className="w-4 h-4 text-blue-500" /> LinkedIn Network</p>
                  <p className="text-xs text-nuanu-gray-500 mt-1">Push to LinkedIn Talent Solutions via API.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-nuanu-gray-50 rounded-lg border border-nuanu-gray-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                <input type="checkbox" name="publishJobStreet" className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-bold text-nuanu-navy flex items-center gap-2"><Webhook className="w-4 h-4 text-indigo-500" /> JobStreet / SEEK</p>
                  <p className="text-xs text-nuanu-gray-500 mt-1">Push to JobStreet job board via API.</p>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-nuanu-gray-100">
              <button type="submit" className="w-full btn-primary py-3 justify-center text-sm">
                <Save className="w-4 h-4" /> Create & Publish Vacancy
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
