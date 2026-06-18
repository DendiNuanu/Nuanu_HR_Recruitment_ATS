"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Star,
  User,
  UserCheck,
  StickyNote,
  Activity,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Job {
  id: string;
  title: string;
  location: string | null;
  department: { name: string } | null;
}

interface Application {
  id: string;
  currentStage: string;
  appliedAt: string;
  source: string;
  job: Job;
}

interface Assessment {
  id: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  passThreshold: number | null;
  isPassed: boolean | null;
  completedAt: string | null;
  createdAt: string;
}

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
  overallRating: number | null;
  recommendation: string | null;
  conductedAt: string | null;
  conductor: { id: string; name: string } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string;
  domicile: string | null;
  stage: string;
  score: number;
  experienceYears: number;
  source: string;
  skills: string[];
  appliedAt: string;
  salaryExpectation: string | null;
  resumeUrl: string | null;
  resumeText: string | null;
  coverLetter: string | null;
  education: string | null;
  noticePeriod: string | null;
}

export interface CandidateFullProfileProps {
  candidate: Candidate & {
    applications: (Application & { job: Job })[];
    assessments: Assessment[];
    referenceChecks: ReferenceCheck[];
    activityLogs: ActivityLog[];
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-100",
  screening: "bg-indigo-50 text-indigo-700 border-indigo-100",
  interview: "bg-amber-50 text-amber-700 border-amber-100",
  assessment: "bg-purple-50 text-purple-700 border-purple-100",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-100",
  hired: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-100",
  talent_bank: "bg-slate-50 text-slate-700 border-slate-100",
};

const SOURCE_COLORS: Record<string, string> = {
  seek: "bg-indigo-50 text-indigo-700 border-indigo-100",
  linkedin: "bg-blue-50 text-blue-700 border-blue-100",
  career_page: "bg-teal-50 text-teal-700 border-teal-100",
  direct: "bg-gray-50 text-gray-700 border-gray-100",
  referral: "bg-purple-50 text-purple-700 border-purple-100",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  started: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

type Tab =
  | "overview"
  | "resume"
  | "assessments"
  | "references"
  | "notes"
  | "timeline";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Profile Overview" },
  { id: "resume", label: "Resume / CV" },
  { id: "assessments", label: "Assessments" },
  { id: "references", label: "Reference Check" },
  { id: "notes", label: "Notes" },
  { id: "timeline", label: "Activity Timeline" },
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    seek: "SEEK",
    linkedin: "LinkedIn",
    career_page: "Careers Page",
    direct: "Direct",
    referral: "Referral",
    other: "Other",
  };
  return map[source] ?? source;
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function CandidateFullProfile({
  candidate,
}: CandidateFullProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const currentApp = candidate.applications[0];
  const appliedFor = currentApp?.job?.title ?? "—";
  const aiScore = Math.round(candidate.score ?? 0);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-[280px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
        {/* Avatar + Name + Role */}
        <div className="flex flex-col items-center px-4 pt-8 pb-4 border-b border-gray-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
            {initials}
          </div>
          <h2 className="mt-3 text-base font-semibold text-gray-900 truncate max-w-full">
            {candidate.name}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 truncate max-w-full">
            {appliedFor}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                STAGE_COLORS[candidate.stage] ??
                "bg-gray-50 text-gray-600 border-gray-100"
              }`}
            >
              {(candidate.stage || "new").replace(/_/g, " ")}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                SOURCE_COLORS[candidate.source] ??
                "bg-gray-50 text-gray-600 border-gray-100"
              }`}
            >
              {sourceLabel(candidate.source)}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Contact
          </p>
          <div className="space-y-2.5">
            <InfoRow
              icon={Mail}
              label="Email"
              value={candidate.email}
              href={`mailto:${candidate.email}`}
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={candidate.phone || "—"}
              href={candidate.phone ? `tel:${candidate.phone}` : undefined}
            />
            <InfoRow
              icon={MapPin}
              label="Location"
              value={candidate.domicile || candidate.location || "—"}
            />
          </div>
        </div>

        {/* Application Info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Application
          </p>
          <div className="space-y-2.5">
            <InfoRow icon={Briefcase} label="Position" value={appliedFor} />
            <InfoRow
              icon={Calendar}
              label="Applied"
              value={formatDate(candidate.appliedAt)}
            />
            <InfoRow
              icon={CircleDollarSign}
              label="Expected Salary"
              value={candidate.salaryExpectation || "—"}
            />
          </div>
        </div>

        {/* AI Match Score */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            AI Match Score
          </p>
          <div className="flex flex-col items-center">
            {/* Ring */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#F3F4F6"
                  strokeWidth="6"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke={
                    aiScore >= 80
                      ? "#10B981"
                      : aiScore >= 60
                        ? "#F59E0B"
                        : "#EF4444"
                  }
                  strokeWidth="6"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 - (aiScore / 100) * 251.3}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-semibold text-gray-900">
                  {aiScore}%
                </span>
              </div>
            </div>

            {/* Sub-bars */}
            <div className="w-full mt-4 space-y-2">
              <SubBar label="Skills" value={Math.round(aiScore * 0.9)} />
              <SubBar label="Experience" value={Math.round(aiScore * 0.75)} />
              <SubBar label="Culture fit" value={Math.round(aiScore * 0.85)} />
            </div>
          </div>
        </div>

        {/* Skills Tags */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── RIGHT MAIN AREA ──────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 bg-white border-b border-gray-100">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Candidates</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-700">{candidate.name}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Previous Candidate"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              title="Next Candidate"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Move Stage
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 bg-white px-6">
          {TABS.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewContent candidate={candidate} aiScore={aiScore} />
          )}
          {activeTab === "resume" && <ResumeContent candidate={candidate} />}
          {activeTab === "assessments" && (
            <AssessmentsContent assessments={candidate.assessments} />
          )}
          {activeTab === "references" && (
            <ReferencesContent referenceChecks={candidate.referenceChecks} />
          )}
          {activeTab === "notes" && (
            <NotesContent
              applications={candidate.applications}
            />
          )}
          {activeTab === "timeline" && (
            <TimelineContent activityLogs={candidate.activityLogs} />
          )}
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab Content Panels                                                        */
/* -------------------------------------------------------------------------- */

function OverviewContent({
  candidate,
  aiScore,
}: {
  candidate: CandidateFullProfileProps["candidate"];
  aiScore: number;
}) {
  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Match Score" value={`${aiScore}%`} />
        <StatCard
          icon={Briefcase}
          label="Years Experience"
          value={`${candidate.experienceYears}`}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Expected Salary"
          value={candidate.salaryExpectation || "—"}
        />
        <StatCard
          icon={Activity}
          label="Current Stage"
          value={(candidate.stage || "new").replace(/_/g, " ")}
        />
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card title="Personal Info">
          <div className="space-y-3">
            <FieldRow label="Full Name" value={candidate.name} />
            <FieldRow label="Location" value={candidate.location || "—"} />
            <FieldRow
              label="Domicile"
              value={candidate.domicile || "—"}
            />
            <FieldRow
              label="Notice Period"
              value={candidate.noticePeriod || "—"}
            />
          </div>
        </Card>

        {/* Work Experience */}
        <Card title="Work Experience">
          <div className="space-y-3">
            <FieldRow
              label="Current Position"
              value={candidate.applications[0]?.job?.title ?? "—"}
            />
            <FieldRow
              label="Experience"
              value={`${candidate.experienceYears} year${candidate.experienceYears === 1 ? "" : "s"}`}
            />
            <FieldRow label="Source" value={sourceLabel(candidate.source)} />
          </div>
        </Card>

        {/* Education */}
        <Card title="Education">
          <div className="space-y-3">
            <FieldRow
              label="Education"
              value={candidate.education || "—"}
            />
            <FieldRow label="Skills" value="—" />
          </div>
        </Card>

        {/* Skills */}
        <Card title="Skills">
          {candidate.skills && candidate.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No skills listed</p>
          )}
        </Card>
      </div>

      {/* Recent Activity (full width) */}
      <Card title="Recent Activity">
        {candidate.activityLogs.length > 0 ? (
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-[11px] w-0.5 bg-gray-100" />
            <div className="space-y-4">
              {candidate.activityLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="relative flex gap-4">
                  <div className="z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-indigo-100">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">
                      {log.action}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No activity recorded yet</p>
        )}
      </Card>
    </div>
  );
}

function ResumeContent({
  candidate,
}: {
  candidate: CandidateFullProfileProps["candidate"];
}) {
  return (
    <div className="space-y-6">
      <Card title="Resume / CV">
        {candidate.resumeUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Resume Document
                  </p>
                  <p className="text-xs text-gray-400">PDF</p>
                </div>
              </div>
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </a>
            </div>
            {/* Embedded PDF viewer */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={candidate.resumeUrl}
                className="w-full h-[600px]"
                title="Resume PDF"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">
              No CV uploaded
            </p>
            <p className="text-sm text-gray-400">
              This candidate has not uploaded a resume yet.
            </p>
          </div>
        )}
      </Card>

      {candidate.resumeText && (
        <Card title="Extracted Text">
          <pre className="whitespace-pre-wrap text-sm text-gray-600 max-h-96 overflow-y-auto">
            {candidate.resumeText.slice(0, 3000)}
            {candidate.resumeText.length > 3000 && "..."}
          </pre>
        </Card>
      )}

      {candidate.coverLetter && (
        <Card title="Cover Letter">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {candidate.coverLetter}
          </p>
        </Card>
      )}
    </div>
  );
}

function AssessmentsContent({
  assessments,
}: {
  assessments: Assessment[];
}) {
  if (assessments.length === 0) {
    return (
      <Card title="Assessments">
        <p className="text-sm text-gray-400">No assessments assigned yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((a) => (
        <Card key={a.id} title={a.title}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">
                {a.type} · {formatDate(a.createdAt)}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {a.status}
            </span>
          </div>
          {a.status === "completed" && a.score !== null && a.maxScore !== null && (
            <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${
                    a.isPassed ? "bg-emerald-500" : "bg-red-400"
                  }`}
                  style={{ width: `${(a.score / a.maxScore) * 100}%` }}
                />
              </div>
              <span
                className={`text-sm font-medium ${
                  a.isPassed ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {a.score}/{a.maxScore} {a.isPassed ? "✓ Passed" : "✗ Failed"}
              </span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function ReferencesContent({
  referenceChecks,
}: {
  referenceChecks: ReferenceCheck[];
}) {
  if (referenceChecks.length === 0) {
    return (
      <Card title="Reference Check">
        <p className="text-sm text-gray-400">
          No reference checks conducted yet
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {referenceChecks.map((ref) => (
        <Card key={ref.id} title={`Reference #${ref.referenceNo}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Company" value={ref.agencyName || "—"} />
            <FieldRow label="Job Title" value={ref.jobTitle || "—"} />
            <FieldRow
              label="Period"
              value={
                ref.employmentFrom
                  ? `${ref.employmentFrom} — ${ref.employmentTo || "Present"}`
                  : "—"
              }
            />
            <FieldRow label="Phone" value={ref.telephone || "—"} />
            <FieldRow label="City" value={ref.cityState || "—"} />
            <FieldRow
              label="Reason for Leaving"
              value={ref.reasonForLeaving || "—"}
            />
            <FieldRow
              label="Eligible for Rehire"
              value={ref.eligibleForRehire || "—"}
            />
            <FieldRow
              label="Overall Rating"
              value={
                ref.overallRating != null
                  ? `${ref.overallRating}/5`
                  : "—"
              }
            />
            <FieldRow label="Recommendation" value={ref.recommendation || "—"} />
            <FieldRow
              label="Conducted by"
              value={ref.conductor?.name ?? "—"}
            />
            <FieldRow
              label="Conducted at"
              value={ref.conductedAt ? formatDate(ref.conductedAt) : "—"}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

function NotesContent({
  applications,
}: {
  applications: CandidateFullProfileProps["candidate"]["applications"];
}) {
  const app = applications[0];
  const applicationId = app?.id;
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!noteText.trim() || !applicationId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to save note");
      }
      toast.success("Note saved successfully");
      setNoteText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Notes">
      <div className="space-y-4">
        <div>
          <textarea
            rows={6}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a note about this candidate..."
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!noteText.trim() || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Note
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}

function TimelineContent({
  activityLogs,
}: {
  activityLogs: ActivityLog[];
}) {
  if (activityLogs.length === 0) {
    return (
      <Card title="Activity Timeline">
        <p className="text-sm text-gray-400">
          No activity events recorded yet
        </p>
      </Card>
    );
  }

  const sorted = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Card title="Activity Timeline">
      <div className="relative">
        <div className="absolute top-0 bottom-0 left-[11px] w-0.5 bg-gray-100" />
        <div className="space-y-5">
          {sorted.map((log) => (
            <div key={log.id} className="relative flex gap-4">
              <div className="z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-indigo-100">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">
                  {log.action}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared Sub-Components                                                     */
/* -------------------------------------------------------------------------- */

function InfoRow({
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
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-gray-400 min-w-0">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs truncate">{label}</span>
      </div>
      <span
        className="text-xs font-medium text-gray-700 truncate max-w-[55%] text-right"
        title={value}
      >
        {value}
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-gray-50 -mx-1 px-1 rounded transition-colors">
        {content}
      </a>
    );
  }
  return content;
}

function SubBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${
            clamped >= 80
              ? "bg-emerald-500"
              : clamped >= 60
                ? "bg-amber-400"
                : "bg-red-400"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-gray-900 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      {title && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className="text-sm font-medium text-gray-700 truncate max-w-[60%] text-right"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}