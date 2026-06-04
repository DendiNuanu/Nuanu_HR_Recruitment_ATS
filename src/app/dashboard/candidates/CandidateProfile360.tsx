"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  X,
  Briefcase,
  GraduationCap,
  Building2,
  Calendar,
  CircleDollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import type { Candidate } from "./CandidatesTable";
import ReferenceCheckTab from "./ReferenceCheckTab";

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

type Tab = "assessments" | "references" | "timeline";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "assessments", label: "Assessments", icon: ClipboardList },
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

const STAGE_PILL: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-100",
  screening: "bg-indigo-50 text-indigo-700 border-indigo-100",
  interview: "bg-amber-50 text-amber-700 border-amber-100",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-100",
  hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-100",
  talent_bank: "bg-slate-50 text-slate-700 border-slate-100",
};

export default function CandidateProfile360({
  candidate,
  vacancyTitle,
  onCloseAction,
}: {
  candidate: Candidate;
  vacancyTitle?: string;
  onCloseAction: () => void;
}) {
  const appliedFor =
    candidate.referPosition ||
    candidate.vacancyTitle ||
    vacancyTitle ||
    "Role not specified";

  const [activeTab, setActiveTab] = useState<Tab>("assessments");
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [timeline, setTimeline] = useState<
    { action: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchTabData = useCallback(
    async (tab: Tab) => {
      if (tab === "references") return;
      setLoading(true);
      try {
        if (tab === "assessments") {
          const res = await fetch(
            `/api/candidates/${candidate.id}/assessments`,
          );
          if (res.ok) setAssessments(await res.json());
        } else if (tab === "timeline") {
          const res = await fetch(`/api/candidates/${candidate.id}/timeline`);
          if (res.ok) setTimeline(await res.json());
        }
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    },
    [candidate.id],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTabData(activeTab);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab, fetchTabData]);

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const aiScore = Math.round(candidate.score ?? 0);
  // Sub-scores are not stored per dimension; show neutral 0s so the layout
  // renders correctly. Replace with real per-dimension scores when the API
  // exposes them.
  const subScores = { skills: 0, experience: 0, culture: 0 };

  return (
    <div className="fixed inset-0 z-[110]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCloseAction}
      />

      {/* Close button — absolute, no header bar */}
      <button
        onClick={onCloseAction}
        aria-label="Close profile"
        className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-nuanu-gray-500 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-nuanu-navy"
      >
        <X className="h-4 w-4" />
      </button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-gray-50"
      >
        <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] gap-4 overflow-hidden p-4">
          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {/* Avatar card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-extrabold text-emerald-700 shadow-sm border border-emerald-200">
                  {initials}
                </div>
                <h2 className="mt-3 text-lg font-extrabold text-nuanu-navy leading-tight">
                  {candidate.name}
                </h2>
                <p className="mt-1 text-xs text-nuanu-gray-500 font-medium">
                  {appliedFor}
                </p>
                <span
                  className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    STAGE_PILL[candidate.stage] ??
                    "bg-gray-50 text-gray-600 border-gray-100"
                  }`}
                >
                  {(candidate.stage || "new").replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Personal data card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Personal data · extracted from CV
              </p>
              <div className="divide-y divide-gray-50">
                <PersonalDataRow
                  icon={UserCheck}
                  label="Full name"
                  value={candidate.name}
                />
                <PersonalDataRow
                  icon={Mail}
                  label="Email"
                  value={candidate.email}
                  href={
                    candidate.email ? `mailto:${candidate.email}` : undefined
                  }
                />
                <PersonalDataRow
                  icon={Phone}
                  label="Phone"
                  value={candidate.phone || "—"}
                  href={candidate.phone ? `tel:${candidate.phone}` : undefined}
                />
                <PersonalDataRow
                  icon={MapPin}
                  label="Location"
                  value={candidate.location || "—"}
                />
                <PersonalDataRow
                  icon={Briefcase}
                  label="Experience"
                  value={
                    candidate.experienceYears
                      ? `${candidate.experienceYears} year${
                          candidate.experienceYears === 1 ? "" : "s"
                        }`
                      : "—"
                  }
                />
                <PersonalDataRow
                  icon={GraduationCap}
                  label="Education"
                  value={"—"}
                />
                <PersonalDataRow
                  icon={Building2}
                  label="Source"
                  value={candidate.source || "Direct"}
                />
              </div>
            </div>

            {/* AI Match Score card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                AI match score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-nuanu-navy">
                  {aiScore}
                </span>
                <span className="text-lg font-bold text-nuanu-gray-400">%</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    aiScore >= 80
                      ? "bg-emerald-500"
                      : aiScore >= 60
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, aiScore))}%` }}
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <SubScoreRow label="Skills" value={subScores.skills} />
                <SubScoreRow label="Experience" value={subScores.experience} />
                <SubScoreRow label="Culture fit" value={subScores.culture} />
              </div>
            </div>
          </aside>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <main className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
            {/* Profile overview card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Profile overview · auto-filled
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  icon={Briefcase}
                  label="Current position"
                  value={appliedFor}
                />
                <StatBox
                  icon={CircleDollarSign}
                  label="Expected salary"
                  value={candidate.salaryExpectation || "—"}
                />
                <StatBox icon={Clock} label="Notice period" value={"—"} />
                <StatBox
                  icon={Calendar}
                  label="Availability"
                  value={
                    candidate.appliedAt
                      ? `Applied ${formatDate(candidate.appliedAt)}`
                      : "—"
                  }
                />
              </div>
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pill tabs (inside the right column) */}
            <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              <div className="flex flex-wrap gap-1">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                        active
                          ? "bg-white text-emerald-700 underline decoration-emerald-500 decoration-2 underline-offset-4 shadow-sm"
                          : "text-nuanu-gray-500 hover:bg-gray-50 hover:text-nuanu-navy"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm min-h-[200px]">
              {activeTab !== "references" && loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : (
                <>
                  {activeTab === "assessments" && (
                    <div className="space-y-3">
                      {assessments.length === 0 ? (
                        <EmptyState
                          icon={ClipboardList}
                          title="No Assessments"
                          message="No assessments have been assigned to this candidate yet."
                        />
                      ) : (
                        assessments.map((assessment) => (
                          <div
                            key={assessment.id}
                            className="rounded-xl border border-gray-100 bg-white p-4"
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <p className="font-bold text-nuanu-navy">
                                  {assessment.title}
                                </p>
                                <p className="mt-0.5 text-xs text-nuanu-gray-400">
                                  {assessment.type} ·{" "}
                                  {formatDate(assessment.createdAt)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                                  STATUS_COLORS[assessment.status] ??
                                  "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {assessment.status}
                              </span>
                            </div>
                            {assessment.status === "completed" &&
                              assessment.score !== null && (
                                <div className="mt-3 flex items-center gap-4 border-t border-gray-50 pt-3">
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className={`h-full rounded-full ${
                                        assessment.isPassed
                                          ? "bg-emerald-500"
                                          : "bg-red-400"
                                      }`}
                                      style={{
                                        width: `${
                                          (assessment.score /
                                            assessment.maxScore) *
                                          100
                                        }%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`text-sm font-bold ${
                                      assessment.isPassed
                                        ? "text-emerald-600"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {assessment.score}/{assessment.maxScore}{" "}
                                    {assessment.isPassed
                                      ? "✓ Passed"
                                      : "✗ Failed"}
                                  </span>
                                </div>
                              )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "references" && (
                    <ReferenceCheckTab
                      applicationId={candidate.id}
                      candidateName={candidate.name}
                      positionLabel={appliedFor}
                    />
                  )}

                  {activeTab === "timeline" && (
                    <div>
                      {timeline.length === 0 ? (
                        <EmptyState
                          icon={Activity}
                          title="No Activity Yet"
                          message="Activity events will appear here as the candidate progresses through the pipeline."
                        />
                      ) : (
                        <div className="relative">
                          <div className="absolute top-0 bottom-0 left-5 w-0.5 bg-gray-100" />
                          <div className="space-y-4">
                            {timeline.map((event, index) => (
                              <div
                                key={`${event.createdAt}-${index}`}
                                className="relative flex gap-4"
                              >
                                <div className="z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-emerald-600">
                                  <Activity className="h-4 w-4" />
                                </div>
                                <div className="flex-1 rounded-xl border border-gray-100 bg-white p-4">
                                  <p className="text-sm font-medium text-nuanu-navy">
                                    {event.action}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-nuanu-gray-400">
                                    <Clock className="h-3 w-3" />{" "}
                                    {formatDate(event.createdAt)}
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
          </main>
        </div>
      </motion.div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function PersonalDataRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2 text-nuanu-gray-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span
        className="text-right text-xs font-bold text-nuanu-navy truncate max-w-[60%]"
        title={value}
      >
        {value}
      </span>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block hover:bg-gray-50 -mx-1 px-1 rounded">
        {content}
      </a>
    );
  }
  return content;
}

function SubScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-nuanu-gray-500">{label}</span>
      <span className="font-bold text-nuanu-navy">{ratingLabel(value)}</span>
    </div>
  );
}

function ratingLabel(v: number): string {
  if (v >= 80) return "Strong";
  if (v >= 60) return "Good";
  if (v >= 40) return "Fair";
  if (v > 0) return "Weak";
  return "—";
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center gap-1.5 text-nuanu-gray-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p
        className="mt-1.5 text-sm font-bold text-nuanu-navy truncate"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
        <Icon className="h-8 w-8 text-nuanu-gray-300" />
      </div>
      <p className="mb-1 text-base font-bold text-nuanu-navy">{title}</p>
      <p className="max-w-xs text-sm text-nuanu-gray-400">{message}</p>
    </div>
  );
}
