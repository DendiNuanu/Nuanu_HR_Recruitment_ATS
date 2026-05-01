"use client";

import { useState } from "react";
import { Search, Filter, Eye, Mail, MoreVertical, Users } from "lucide-react";
import { motion } from "framer-motion";

type Candidate = {
  id: string;
  name: string;
  email: string;
  vacancyTitle: string;
  stage: string;
  score: number;
  experienceYears: number;
  location: string;
  appliedAt: string;
};

export default function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                       c.email.toLowerCase().includes(search.toLowerCase()) ||
                       c.vacancyTitle.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.stage.toLowerCase() === stageFilter.toLowerCase();
    return matchSearch && matchStage;
  });

  return (
    <div className="card pb-32">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 border-b border-nuanu-gray-100 pb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nuanu-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative min-w-[200px]">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="all">All Stages</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="hr_interview">HR Interview</option>
            <option value="user_interview">User Interview</option>
            <option value="final_interview">Final Interview</option>
            <option value="offer">Offer</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nuanu-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table min-w-full">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Applied For</th>
              <th>Stage</th>
              <th>AI Match</th>
              <th>Applied Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((candidate, i) => (
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={candidate.id}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-sm">
                      {candidate.name.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-nuanu-navy">{candidate.name}</p>
                      <p className="text-xs text-nuanu-gray-500">{candidate.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <p className="font-medium text-nuanu-navy">{candidate.vacancyTitle}</p>
                  <p className="text-xs text-nuanu-gray-500">{candidate.experienceYears} yrs exp • {candidate.location}</p>
                </td>
                <td>
                  <span className={`badge ${
                    candidate.stage.toLowerCase() === "hired" ? "bg-emerald-100 text-emerald-700" :
                    candidate.stage.toLowerCase() === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-blue-50 text-blue-700"
                  } uppercase tracking-wider text-[10px]`}>
                    {candidate.stage.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-full max-w-[100px] h-2 bg-nuanu-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${candidate.score >= 80 ? 'bg-nuanu-emerald' : candidate.score >= 60 ? 'bg-nuanu-warning' : 'bg-nuanu-error'}`}
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-nuanu-navy w-8">{Math.round(candidate.score)}%</span>
                  </div>
                </td>
                <td>
                  <span className="text-sm text-nuanu-gray-500">{new Date(candidate.appliedAt).toLocaleDateString()}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2 relative">
                    <button onClick={() => alert("Opening Candidate Profile (Demo)")} className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-emerald bg-nuanu-gray-50 hover:bg-emerald-50 rounded transition-colors" title="View Profile">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => alert(`Drafting email to ${candidate.email} (Demo)`)} className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 bg-nuanu-gray-50 hover:bg-blue-50 rounded transition-colors" title="Send Email">
                      <Mail className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === candidate.id ? null : candidate.id)}
                        className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy bg-nuanu-gray-50 hover:bg-nuanu-gray-200 rounded transition-colors" 
                        title="More Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeMenuId === candidate.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 mt-1 w-40 bg-white border border-nuanu-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                            <button onClick={() => { alert('Moved to next stage (Demo)'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-nuanu-gray-700 hover:bg-nuanu-gray-50 transition-colors">
                              Move to Next Stage
                            </button>
                            <button onClick={() => { alert('Candidate rejected (Demo)'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-nuanu-gray-100">
                              Reject Candidate
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-nuanu-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-nuanu-navy">No candidates found</h3>
            <p className="text-nuanu-gray-500 mt-1">Try adjusting your search or filters, or submit an application from the /careers page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
