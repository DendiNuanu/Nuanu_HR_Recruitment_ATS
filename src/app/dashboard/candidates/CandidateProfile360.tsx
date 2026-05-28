"use client";

/**
 * CandidateProfile360
 * Extended candidate profile modal with all enterprise tabs.
 * Rendered alongside the existing CandidatesTable profile modal.
 * Triggered by a "Full Profile" button added to the existing modal footer.
 */

import { useState, useEffect, useCallback } from "react";
import {
  X, ClipboardList, MessageSquare, Activity, UserCheck, Star, Download,
  Loader2, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Candidate } from "./CandidatesTable";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReferenceCheck {
  id: string;
  referenceNo: number;
  agencyName: string | null;
  telephone: string | null;
  cityState: string | null;
  jobTitle: string | null;
  employmentFrom: string | null;
  employmentTo: string | null;
  reasonForLeaving: string | null;
  eligibleForRehire: string | null;
  rehireRemarks: string | null;
  personProvidingInfo: string | null;
  personTitle: string | null;
  workPerformance: string | null;
  strengths: string | null;
  areasToImprove: string | null;
  additionalNotes: string | null;
  overallRating: number | null;
  recommendation: string | null;
  conductedAt: string | null;
  updatedAt: string;
  conductor?: { id: string; name: string; email: string };
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
  { id: "references", label: "Reference Check", icon: UserCheck },
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
  const [referenceChecks, setReferenceChecks] = useState<ReferenceCheck[]>([]);
  const [timeline, setTimeline] = useState<{ action: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(false);

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
        const res = await fetch(`/api/candidates/${candidate.id}/reference-check`);
        if (res.ok) {
          const payload = await res.json();
          setReferenceChecks(payload.referenceChecks ?? []);
        }
      } else if (tab === "timeline") {
        const res = await fetch(`/api/candidates/${candidate.id}/timeline`);
        if (res.ok) setTimeline(await res.json());
      }
    } catch { /* non-fatal */ }
    setLoading(false);
  }, [candidate.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTabData(activeTab);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, fetchTabData]);

  // ── Reference check handlers ─────────────────────────────────────────────
  const handleRefCheckSave = async () => {
    await fetchTabData("references");
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
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm text-gray-700">
                      Reference Check & Employment Verification
                    </h3>
                    {referenceChecks.length > 0 && (
                      <button
                        onClick={() => window.open(`/api/candidates/${candidate.id}/reference-check/pdf`, "_blank")}
                        className="text-sm flex items-center gap-1.5 text-green-600 hover:text-green-700 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </div>
                  {[1, 2, 3].map((refNo) => (
                    <ReferenceCheckCard
                      key={`${refNo}-${referenceChecks.find((item) => item.referenceNo === refNo)?.updatedAt ?? "new"}`}
                      referenceNo={refNo}
                      data={referenceChecks.find((item) => item.referenceNo === refNo) ?? null}
                      candidateId={candidate.id}
                      onSave={handleRefCheckSave}
                    />
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

function ReferenceCheckCard({
  referenceNo,
  data,
  candidateId,
  onSave,
}: {
  referenceNo: number;
  data: ReferenceCheck | null;
  candidateId: string;
  onSave: () => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(!data);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ReferenceCheck>>(data ?? {});

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Reference {referenceNo}</span>
          {data?.agencyName && (
            <span className="text-xs text-gray-500">{data.agencyName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {data ? "Completed" : "Not started"}
          </span>
          <span className="text-xs text-gray-500">{isExpanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b pb-1">
            I. Employment History Verification
          </div>

          <div>
            <label className="text-xs text-gray-500">Agency / Organization</label>
            <input
              type="text"
              value={form.agencyName ?? ""}
              onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
              className="mt-1 w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telephone" value={form.telephone} onChange={(value) => setForm({ ...form, telephone: value })} />
            <Field label="City / State" value={form.cityState} onChange={(value) => setForm({ ...form, cityState: value })} />
          </div>
          <Field label="Job Title" value={form.jobTitle} onChange={(value) => setForm({ ...form, jobTitle: value })} />

          <div>
            <label className="text-xs text-gray-500">Employment Date(s)</label>
            <div className="flex gap-2 mt-1 items-center">
              <input type="text" value={form.employmentFrom ?? ""} onChange={(e) => setForm({ ...form, employmentFrom: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5" placeholder="From" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="text" value={form.employmentTo ?? ""} onChange={(e) => setForm({ ...form, employmentTo: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5" placeholder="To" />
            </div>
          </div>

          <Field label="Reason(s) for Leaving" value={form.reasonForLeaving} onChange={(value) => setForm({ ...form, reasonForLeaving: value })} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Eligible for Rehire</label>
              <select value={form.eligibleForRehire ?? ""} onChange={(e) => setForm({ ...form, eligibleForRehire: e.target.value })} className="mt-1 w-full text-sm border border-gray-200 rounded px-3 py-1.5 bg-white">
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="With Conditions">With Conditions</option>
              </select>
            </div>
            <Field label="Remarks" value={form.rehireRemarks} onChange={(value) => setForm({ ...form, rehireRemarks: value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Person Providing Information" value={form.personProvidingInfo} onChange={(value) => setForm({ ...form, personProvidingInfo: value })} />
            <Field label="Title" value={form.personTitle} onChange={(value) => setForm({ ...form, personTitle: value })} />
          </div>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b pb-1 mt-4">
            Additional Notes (HR Internal)
          </div>

          <Area label="How would you describe their work performance?" value={form.workPerformance} onChange={(value) => setForm({ ...form, workPerformance: value })} />
          <Area label="Key Strengths" value={form.strengths} onChange={(value) => setForm({ ...form, strengths: value })} />
          <Area label="Areas for Improvement" value={form.areasToImprove} onChange={(value) => setForm({ ...form, areasToImprove: value })} />
          <Area label="Additional Notes" value={form.additionalNotes} onChange={(value) => setForm({ ...form, additionalNotes: value })} />

          <div>
            <label className="text-xs text-gray-500">Overall Rating</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setForm({ ...form, overallRating: star })} className={`text-xl ${(form.overallRating ?? 0) >= star ? "text-yellow-400" : "text-gray-200"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">HR Recommendation</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {["RECOMMEND", "RECOMMEND_WITH_RESERVATION", "NOT_RECOMMEND"].map((opt) => (
                <button key={opt} type="button" onClick={() => setForm({ ...form, recommendation: opt })} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${form.recommendation === opt ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                  {opt === "RECOMMEND" ? "Recommend" : opt === "RECOMMEND_WITH_RESERVATION" ? "With Reservation" : "Do Not Recommend"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                setSaving(true);
                const res = await fetch(`/api/candidates/${candidateId}/reference-check`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ referenceNo, ...form }),
                });
                setSaving(false);
                if (!res.ok) {
                  toast.error("Failed to save reference check");
                  return;
                }
                toast.success("Reference check saved");
                await onSave();
              }}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Reference Check"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full text-sm border border-gray-200 rounded px-3 py-1.5" />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full text-sm border border-gray-200 rounded px-3 py-1.5 resize-none" />
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
