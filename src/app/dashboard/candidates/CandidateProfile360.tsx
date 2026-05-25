"use client";

/**
 * CandidateProfile360
 * Extended candidate profile modal with all enterprise tabs.
 * Rendered alongside the existing CandidatesTable profile modal.
 * Triggered by a "Full Profile" button added to the existing modal footer.
 */

import { useState, useEffect, useCallback } from "react";
import {
  X, FileText, StickyNote, ClipboardList, MessageSquare,
  Gift, FileSignature, Activity, UserCheck, Star, Download,
  ExternalLink, Plus, Loader2, CheckCircle2, AlertCircle,
  Clock, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Candidate } from "./CandidatesTable";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReferenceCheck {
  id: string;
  refereeName: string;
  relationship: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  feedback: string | null;
  rating: number | null;
  status: string;
  notes: string | null;
  recommendation: string | null;
  checkedAt: string | null;
  createdAt: string;
}

interface AssessmentResult {
  id: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number;
  passThreshold: number;
  isPassed: boolean | null;
  completedAt: string | null;
  createdAt: string;
}

interface InterviewFeedbackItem {
  id: string;
  overallRating: number;
  technicalScore: number | null;
  communicationScore: number | null;
  cultureFitScore: number | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendation: string;
  notes: string | null;
  submittedAt: string | null;
  interviewerName: string;
}

type Tab = "assessments" | "feedback" | "references" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "feedback", label: "Interview Feedback", icon: MessageSquare },
  { id: "references", label: "Reference Checks", icon: UserCheck },
  { id: "timeline", label: "Activity Timeline", icon: Activity },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-blue-100 text-blue-700",
  verified: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function CandidateProfile360({
  candidate,
  vacancyTitle,
  onClose,
}: {
  candidate: Candidate;
  vacancyTitle?: string;
  onClose: () => void;
}) {
  const appliedFor =
    candidate.referPosition || candidate.vacancyTitle || vacancyTitle;
  const [activeTab, setActiveTab] = useState<Tab>("assessments");
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [feedback, setFeedback] = useState<InterviewFeedbackItem[]>([]);
  const [references, setReferences] = useState<ReferenceCheck[]>([]);
  const [timeline, setTimeline] = useState<{ action: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Reference check form
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm, setRefForm] = useState({ refereeName: "", relationship: "", company: "", phone: "", email: "", notes: "" });
  const [savingRef, setSavingRef] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchTabData = useCallback(async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === "assessments") {
        const res = await fetch(`/api/candidates/${candidate.id}/assessments`);
        if (res.ok) setAssessments(await res.json());
      } else if (tab === "feedback") {
        const res = await fetch(`/api/candidates/${candidate.id}/feedback`);
        if (res.ok) setFeedback(await res.json());
      } else if (tab === "references") {
        const res = await fetch(`/api/reference-checks?applicationId=${candidate.id}`);
        if (res.ok) setReferences(await res.json());
      } else if (tab === "timeline") {
        const res = await fetch(`/api/candidates/${candidate.id}/timeline`);
        if (res.ok) setTimeline(await res.json());
      }
    } catch { /* non-fatal */ }
    setLoading(false);
  }, [candidate.id]);

  useEffect(() => { fetchTabData(activeTab); }, [activeTab, fetchTabData]);

  // ── Reference check handlers ─────────────────────────────────────────────

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refForm.refereeName || !refForm.relationship) return;
    setSavingRef(true);
    try {
      const res = await fetch("/api/reference-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: candidate.id, ...refForm }),
      });
      if (res.ok) {
        const newRef = await res.json();
        setReferences((prev) => [newRef, ...prev]);
        setRefForm({ refereeName: "", relationship: "", company: "", phone: "", email: "", notes: "" });
        setShowRefForm(false);
        toast.success("Reference check added");
      } else {
        toast.error("Failed to add reference check");
      }
    } catch { toast.error("Network error"); }
    setSavingRef(false);
  };

  const handleUpdateRefStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/reference-checks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReferences((prev) => prev.map((r) => r.id === id ? updated : r));
      toast.success("Status updated");
    }
  };

  const handleDeleteRef = async (id: string) => {
    if (!confirm("Delete this reference check?")) return;
    const res = await fetch(`/api/reference-checks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReferences((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-nuanu-navy to-[#0D2040] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg">
              {candidate.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{candidate.name}</h2>
              <p className="text-sm text-white/50">
                {appliedFor || "Role not specified"} · 360° Profile
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {appliedFor && (
          <div className="px-6 py-3 border-b border-gray-100 bg-emerald-50/40 flex-shrink-0">
            <p className="text-[10px] font-bold text-nuanu-gray-400 uppercase tracking-[0.12em]">
              Applied For
            </p>
            <p className="text-sm font-bold text-nuanu-navy mt-0.5">{appliedFor}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 flex-shrink-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? "border-emerald-500 text-emerald-700 bg-white"
                  : "border-transparent text-nuanu-gray-400 hover:text-nuanu-navy hover:bg-white/60"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Assessments ── */}
              {activeTab === "assessments" && (
                <div className="p-6 space-y-4">
                  {assessments.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="No Assessments" message="No assessments have been assigned to this candidate yet." />
                  ) : assessments.map((a) => (
                    <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-nuanu-navy">{a.title}</p>
                          <p className="text-xs text-nuanu-gray-400 mt-0.5">{a.type} · {formatDate(a.createdAt)}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.status}
                        </span>
                      </div>
                      {a.status === "completed" && a.score !== null && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${a.isPassed ? "bg-emerald-500" : "bg-red-400"}`}
                              style={{ width: `${(a.score / a.maxScore) * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${a.isPassed ? "text-emerald-600" : "text-red-500"}`}>
                            {a.score}/{a.maxScore} {a.isPassed ? "✓ Passed" : "✗ Failed"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Interview Feedback ── */}
              {activeTab === "feedback" && (
                <div className="p-6 space-y-4">
                  {feedback.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="No Feedback Yet" message="Interview feedback will appear here once interviewers submit their evaluations." />
                  ) : feedback.map((f) => (
                    <div key={f.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-nuanu-navy">{f.interviewerName}</p>
                          {f.submittedAt && <p className="text-xs text-nuanu-gray-400">{formatDate(f.submittedAt)}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-4 h-4 ${s <= f.overallRating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: "Technical", value: f.technicalScore },
                          { label: "Communication", value: f.communicationScore },
                          { label: "Culture Fit", value: f.cultureFitScore },
                        ].filter((s) => s.value !== null).map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-nuanu-gray-400 mb-1">{label}</p>
                            <p className="text-lg font-bold text-nuanu-navy">{value}/5</p>
                          </div>
                        ))}
                        <div className={`rounded-xl p-3 text-center ${
                          f.recommendation === "proceed" ? "bg-emerald-50" :
                          f.recommendation === "reject" ? "bg-red-50" : "bg-gray-50"
                        }`}>
                          <p className="text-xs text-nuanu-gray-400 mb-1">Decision</p>
                          <p className={`text-sm font-bold capitalize ${
                            f.recommendation === "proceed" ? "text-emerald-700" :
                            f.recommendation === "reject" ? "text-red-600" : "text-gray-600"
                          }`}>{f.recommendation}</p>
                        </div>
                      </div>
                      {f.strengths && (
                        <div className="mb-2">
                          <p className="text-xs font-bold text-emerald-600 mb-1">Strengths</p>
                          <p className="text-sm text-nuanu-gray-700">{f.strengths}</p>
                        </div>
                      )}
                      {f.weaknesses && (
                        <div>
                          <p className="text-xs font-bold text-red-500 mb-1">Areas for Improvement</p>
                          <p className="text-sm text-nuanu-gray-700">{f.weaknesses}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Reference Checks ── */}
              {activeTab === "references" && (
                <div className="p-6 space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowRefForm(!showRefForm)}
                      className="btn-primary text-sm flex items-center gap-2 py-2"
                    >
                      <Plus className="w-4 h-4" /> Add Reference
                    </button>
                  </div>

                  {/* Add form */}
                  <AnimatePresence>
                    {showRefForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAddReference}
                        className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 overflow-hidden"
                      >
                        <h3 className="font-bold text-nuanu-navy text-sm">New Reference Check</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Referee Name *</label>
                            <input required type="text" className="input-field py-2 text-sm" value={refForm.refereeName}
                              onChange={(e) => setRefForm({ ...refForm, refereeName: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Relationship *</label>
                            <input required type="text" className="input-field py-2 text-sm" placeholder="e.g. Direct Manager"
                              value={refForm.relationship} onChange={(e) => setRefForm({ ...refForm, relationship: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Company</label>
                            <input type="text" className="input-field py-2 text-sm" value={refForm.company}
                              onChange={(e) => setRefForm({ ...refForm, company: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Email</label>
                            <input type="email" className="input-field py-2 text-sm" value={refForm.email}
                              onChange={(e) => setRefForm({ ...refForm, email: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Phone</label>
                            <input type="tel" className="input-field py-2 text-sm" value={refForm.phone}
                              onChange={(e) => setRefForm({ ...refForm, phone: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-nuanu-gray-600 mb-1">Notes</label>
                            <input type="text" className="input-field py-2 text-sm" value={refForm.notes}
                              onChange={(e) => setRefForm({ ...refForm, notes: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setShowRefForm(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                          <button type="submit" disabled={savingRef} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                            {savingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {references.length === 0 && !showRefForm ? (
                    <EmptyState icon={UserCheck} title="No Reference Checks" message="Add referee details to begin the reference check process." />
                  ) : references.map((ref) => (
                    <div key={ref.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-nuanu-navy">{ref.refereeName}</p>
                          <p className="text-xs text-nuanu-gray-400">{ref.relationship}{ref.company ? ` · ${ref.company}` : ""}</p>
                          {ref.email && <p className="text-xs text-nuanu-gray-400">{ref.email}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[ref.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {ref.status}
                          </span>
                          <button onClick={() => handleDeleteRef(ref.id)}
                            className="p-1.5 text-nuanu-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {ref.feedback && (
                        <p className="text-sm text-nuanu-gray-700 bg-gray-50 rounded-xl p-3 mb-3">{ref.feedback}</p>
                      )}
                      {ref.status !== "verified" && ref.status !== "failed" && (
                        <div className="flex gap-2 flex-wrap">
                          {["contacted", "verified", "failed"].map((s) => (
                            <button key={s} onClick={() => handleUpdateRefStatus(ref.id, s)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors capitalize">
                              Mark {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Timeline ── */}
              {activeTab === "timeline" && (
                <div className="p-6">
                  {timeline.length === 0 ? (
                    <EmptyState icon={Activity} title="No Activity Yet" message="Activity events will appear here as the candidate progresses through the pipeline." />
                  ) : (
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-4">
                        {timeline.map((event, i) => (
                          <div key={i} className="flex gap-4 relative">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                              <p className="text-sm font-medium text-nuanu-navy">{event.action}</p>
                              <p className="text-xs text-nuanu-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDate(event.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-nuanu-gray-300" />
      </div>
      <p className="text-lg font-bold text-nuanu-navy mb-1">{title}</p>
      <p className="text-sm text-nuanu-gray-400 max-w-xs">{message}</p>
    </div>
  );
}
