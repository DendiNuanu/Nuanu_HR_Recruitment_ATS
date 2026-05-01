"use client";

import { useState } from "react";
import { Search, Filter, Eye, Mail, MoreVertical, Users, X, Check, Loader2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateCandidateStage } from "./actions";

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
  skills?: string[];
  coverLetter?: string;
  resumeUrl?: string;
};

export default function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Modals state
  const [selectedProfile, setSelectedProfile] = useState<Candidate | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Candidate | null>(null);
  
  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                       c.email.toLowerCase().includes(search.toLowerCase()) ||
                       c.vacancyTitle.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || c.stage.toLowerCase() === stageFilter.toLowerCase();
    return matchSearch && matchStage;
  });

  const handleStageAction = async (id: string, action: "next" | "reject") => {
    setLoadingActionId(id);
    setActiveMenuId(null);
    try {
      await updateCandidateStage(id, action);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleSendEmail = () => {
    setIsSendingEmail(true);
    // Simulate API call
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);
      setTimeout(() => {
        setEmailSent(false);
        setSelectedEmail(null);
      }, 2000);
    }, 1500);
  };

  const openEmailModal = (c: Candidate) => {
    setSelectedEmail(c);
    setEmailSubject(`Update regarding your application for ${c.vacancyTitle} at Nuanu`);
    setEmailBody(`Hi ${c.name},\n\nThank you for applying for the ${c.vacancyTitle} position. We wanted to reach out regarding the next steps in our process.\n\nBest regards,\nNuanu Recruitment Team`);
    setEmailSent(false);
  };

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
                    <button 
                      onClick={() => setSelectedProfile(candidate)} 
                      className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-emerald bg-nuanu-gray-50 hover:bg-emerald-50 rounded transition-colors" 
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEmailModal(candidate)} 
                      className="p-1.5 text-nuanu-gray-400 hover:text-blue-600 bg-nuanu-gray-50 hover:bg-blue-50 rounded transition-colors" 
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <div className="relative">
                      {loadingActionId === candidate.id ? (
                        <div className="p-1.5 text-nuanu-emerald">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === candidate.id ? null : candidate.id)}
                          className="p-1.5 text-nuanu-gray-400 hover:text-nuanu-navy bg-nuanu-gray-50 hover:bg-nuanu-gray-200 rounded transition-colors" 
                          title="More Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                      
                      {activeMenuId === candidate.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 mt-1 w-40 bg-white border border-nuanu-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                            <button 
                              onClick={() => handleStageAction(candidate.id, "next")} 
                              className="w-full text-left px-4 py-2 text-sm text-nuanu-gray-700 hover:bg-nuanu-gray-50 transition-colors"
                            >
                              Move to Next Stage
                            </button>
                            <button 
                              onClick={() => handleStageAction(candidate.id, "reject")} 
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-nuanu-gray-100"
                            >
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

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedProfile(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedProfile.name.split(" ").map(n => n[0]).join("").substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-nuanu-navy">{selectedProfile.name}</h2>
                    <p className="text-sm text-nuanu-gray-500">{selectedProfile.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Applied For</p>
                    <p className="font-medium text-nuanu-navy">{selectedProfile.vacancyTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Stage</p>
                    <span className="badge bg-blue-50 text-blue-700 uppercase tracking-wider text-[10px]">
                      {selectedProfile.stage.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Applied Date</p>
                    <p className="text-sm font-medium text-nuanu-navy">{new Date(selectedProfile.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-sm font-medium text-nuanu-navy">{selectedProfile.location}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Match Analysis</p>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                        <circle 
                          cx="32" cy="32" r="28" 
                          fill="none" 
                          stroke={selectedProfile.score >= 80 ? "#10B981" : selectedProfile.score >= 60 ? "#F59E0B" : "#EF4444"} 
                          strokeWidth="6" 
                          strokeDasharray="175.9" 
                          strokeDashoffset={175.9 - (selectedProfile.score / 100) * 175.9}
                          strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-nuanu-navy">{Math.round(selectedProfile.score)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-nuanu-navy mb-1">
                        {selectedProfile.score >= 80 ? "Strong Match" : selectedProfile.score >= 60 ? "Potential Match" : "Weak Match"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProfile.skills?.map(skill => (
                          <span key={skill} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProfile.coverLetter && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cover Letter</p>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedProfile.coverLetter}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                {selectedProfile.resumeUrl && (
                  <a
                    href={selectedProfile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary mr-auto flex items-center gap-2"
                  >
                    View Resume / CV
                  </a>
                )}
                <button 
                  onClick={() => setSelectedProfile(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setSelectedProfile(null);
                    openEmailModal(selectedProfile);
                  }}
                  className="btn-primary"
                >
                  <Mail className="w-4 h-4" /> Message Candidate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Draft Email Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSendingEmail && setSelectedEmail(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-nuanu-navy flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" /> New Message
                </h2>
                <button 
                  onClick={() => !isSendingEmail && setSelectedEmail(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isSendingEmail}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {emailSent ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-nuanu-navy mb-2">Message Sent!</h3>
                  <p className="text-gray-500">Your email has been sent to {selectedEmail.email}</p>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">To:</label>
                      <div className="input-field bg-gray-50 text-gray-700 font-medium">
                        {selectedEmail.name} &lt;{selectedEmail.email}&gt;
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Subject:</label>
                      <input 
                        type="text" 
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="input-field"
                        placeholder="Email subject"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Message:</label>
                      <textarea 
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="input-field min-h-[200px] resize-y"
                        placeholder="Type your message here..."
                      />
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="btn-secondary"
                      disabled={isSendingEmail}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSendEmail}
                      className="btn-primary"
                      disabled={isSendingEmail}
                    >
                      {isSendingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send Email
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
