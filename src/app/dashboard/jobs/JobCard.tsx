"use client";

import { useState } from "react";
import { Briefcase, Users, Eye, Edit, MoreVertical, Trash2, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JobCard({ job }: { job: any }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    setIsDeleting(true);
    // Real implementation would call API
    // await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    // router.refresh();
    setTimeout(() => {
      alert("Job deleted (Simulated for Demo)");
      setIsDeleting(false);
      setIsMenuOpen(false);
    }, 500);
  };

  const handleDuplicate = () => {
    alert("Job duplicated (Simulated for Demo)");
    setIsMenuOpen(false);
  };

  return (
    <div className="border border-nuanu-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-emerald-100 transition-all group bg-white relative">
      <div className="flex justify-between items-start mb-3">
        <span className={`badge ${
          job.status === "published" ? "bg-emerald-100 text-emerald-700" :
          job.status === "draft" ? "bg-nuanu-gray-100 text-nuanu-gray-700" :
          "bg-amber-100 text-amber-700"
        }`}>
          {job.status}
        </span>
        
        {/* 3 Dots Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-nuanu-gray-400 hover:text-nuanu-navy p-1 rounded-md hover:bg-nuanu-gray-50 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-white border border-nuanu-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                <button 
                  onClick={handleDuplicate}
                  className="w-full text-left px-4 py-2 text-sm text-nuanu-gray-700 hover:bg-nuanu-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <h3 className="font-bold text-nuanu-navy mb-1 group-hover:text-emerald-600 transition-colors">
        {job.title}
      </h3>
      <p className="text-xs text-nuanu-gray-500 mb-4 flex items-center gap-1">
        {job.code} <span className="w-1 h-1 bg-nuanu-gray-300 rounded-full mx-1"></span> {job.department?.name || "General"}
      </p>

      <div className="flex items-center gap-4 text-sm text-nuanu-gray-600 mb-5">
        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-nuanu-gray-400" /> {job.employmentType}</span>
        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-nuanu-gray-400" /> {job.filledCount}/{job.headcount} Hired</span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-nuanu-gray-50">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-bold w-6 h-6 rounded-md">
            {job._count?.applications || 0}
          </span>
          <span className="text-xs text-nuanu-gray-500 font-medium">Candidates</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/careers/${job.id}`} target="_blank" className="p-1.5 text-nuanu-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="View Public Page">
            <Eye className="w-4 h-4" />
          </Link>
          {/* Using # for edit since edit page doesn't exist yet, but alerting instead to simulate feature */}
          <button onClick={() => alert('Edit page feature opening soon (Demo)')} className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Job">
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
