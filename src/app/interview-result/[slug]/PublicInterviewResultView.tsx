"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  LogOut,
  MapPin,
  Save,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  Users,
  XCircle,
  AlertCircle,
} from "lucide-react";

export type PublicFeedbackSection = {
  reviewerType: "HR" | "USER_1" | "USER_2";
  reviewerLabel: string;
  reviewerName: string | null;
  rating: number | null;
  recommendation: string | null;
  comments: string;
  authorName: string;
  updatedAt: string;
} | null;

export type PublicSessionInfo = {
  id: string;
  name: string;
  email: string;
  isHr: boolean;
  isAssignedReviewer: boolean;
};

export type PublicInterviewPermissions = {
  canViewHr: boolean;
  canViewUser1: boolean;
  canViewUser2: boolean;
  canEditHr: boolean;
  canEditUser1: boolean;
  canEditUser2: boolean;
};

export type PublicInterviewResultData = {
  applicationId: string;
  candidate: { id: string; name: string };
  application: {
    position: string;
    location: string | null;
    stage: string;
    status: string;
  };
  assignedReviewers: {
    hr: string | null;
    user1: string | null;
    user2: string | null;
  };
  reviewerIds: {
    hr: string | null;
    user1: string | null;
    user2: string | null;
  };
  feedback: {
    hr: PublicFeedbackSection;
    user1: PublicFeedbackSection;
    user2: PublicFeedbackSection;
  };
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatStage(stage: string): string {
  return stage
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStageStyle(stage: string) {
  const v = stage.toUpperCase();

  if (v.includes("REJECT") || v.includes("DECLINE") || v.includes("FAIL")) {
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <XCircle className="h-4 w-4" />,
    };
  }

  if (v.includes("HIRE") || v.includes("ACCEPT") || v.includes("PASS")) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (v.includes("INTERVIEW")) {
    return {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: <User className="h-4 w-4" />,
    };
  }

  if (v.includes("SCREEN") || v.includes("REVIEW")) {
    return {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      icon: <FileText className="h-4 w-4" />,
    };
  }

  if (v.includes("OFFER")) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Award className="h-4 w-4" />,
    };
  }

  return {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: <Briefcase className="h-4 w-4" />,
  };
}

function getRecommendationMeta(rec: string | null) {
  if (!rec) {
    return {
      label: "No Recommendation",
      color: "text-slate-600",
      bg: "bg-slate-100",
      border: "border-slate-200",
      icon: <AlertCircle className="h-4 w-4" />,
    };
  }

  const v = rec.toLowerCase();

  if (
    v.includes("strong") ||
    v.includes("hire") ||
    v.includes("recommend") ||
    v.includes("yes") ||
    v.includes("advance") ||
    v.includes("accept")
  ) {
    return {
      label: rec,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (
    v.includes("no") ||
    v.includes("reject") ||
    v.includes("decline") ||
    v.includes("not")
  ) {
    return {
      label: rec,
      color: "text-rose-700",
      bg: "bg-rose-50",
      border: "border-rose-200",
      icon: <XCircle className="h-4 w-4" />,
    };
  }

  if (
    v.includes("maybe") ||
    v.includes("hold") ||
    v.includes("consider") ||
    v.includes("undecided")
  ) {
    return {
      label: rec,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <Clock className="h-4 w-4" />,
    };
  }

  return {
    label: rec,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
  };
}

function TealAvatar({ name, size = 72 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 font-black text-white shadow-xl shadow-emerald-500/20 ring-4 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {getInitials(name)}
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          {icon}
        </span>
        <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      </div>

      <div className="min-w-0 break-words text-2xl font-black tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function EditableReviewerCard({
  title,
  assignedTo,
  section,
  applicationId,
  reviewerType,
  canEdit,
  currentUserName,
  index,
  onSaved,
}: {
  title: string;
  assignedTo: string | null;
  section: PublicFeedbackSection;
  applicationId: string;
  reviewerType: "HR" | "USER_1" | "USER_2";
  canEdit: boolean;
  currentUserName: string;
  index: number;
  onSaved: () => void;
}) {
  const [comments, setComments] = useState<string>(section?.comments ?? "");
  const [rating, setRating] = useState<number | null>(section?.rating ?? null);
  const [recommendation, setRecommendation] = useState<string>(
    section?.recommendation ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rec = getRecommendationMeta(recommendation || null);

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You are not allowed to edit this section.");
      return;
    }

    const trimmed = comments.trim();

    if (!trimmed) {
      toast.error("Comments are required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/candidates/${applicationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerType,
          rating,
          recommendation: recommendation || null,
          comments: trimmed,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        toast.error(payload.error || "Failed to save comment");
        return;
      }

      toast.success(`${title} comment saved`);

      startTransition(() => {
        onSaved();
      });
    } catch {
      toast.error("Network error while saving comment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 + index * 0.05 }}
      className="flex min-h-[520px] w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex min-w-0 flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Reviewer
          </p>

          <h3 className="mt-1 break-words text-xl font-black text-slate-950">
            {title}
          </h3>

          {assignedTo ? (
            <p className="mt-1 break-words text-sm font-bold text-slate-500">
              {assignedTo}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold italic text-slate-400">
              Unassigned
            </p>
          )}
        </div>

        <span
          className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
            section
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
          }`}
        >
          {section ? "Submitted" : "Pending"}
        </span>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-5">
        <div className="min-w-0">
          <p className="mb-2 break-words text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Rating
          </p>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={!canEdit}
                onClick={() => setRating((cur) => (cur === n ? null : n))}
                className="rounded-xl p-1 transition hover:scale-110 hover:bg-amber-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent"
                aria-label={`Set rating to ${n}`}
              >
                <Star
                  className={
                    rating != null && n <= rating
                      ? "h-7 w-7 fill-amber-400 text-amber-400"
                      : "h-7 w-7 text-slate-200"
                  }
                  strokeWidth={1.8}
                />
              </button>
            ))}

            {rating != null ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                {rating}/5
              </span>
            ) : (
              canEdit && (
                <span className="break-words text-sm italic text-slate-400">
                  Optional rating
                </span>
              )
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 break-words text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Recommendation
          </p>

          {canEdit ? (
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">No recommendation</option>
              <option value="Strong hire">Strong hire</option>
              <option value="Hire">Hire</option>
              <option value="Maybe">Maybe</option>
              <option value="No hire">No hire</option>
              <option value="Strong no hire">Strong no hire</option>
            </select>
          ) : recommendation ? (
            <span
              className={`inline-flex w-fit max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${rec.bg} ${rec.color} ${rec.border}`}
            >
              {rec.icon}
              <span className="break-words">{rec.label}</span>
            </span>
          ) : (
            <span className="text-sm italic text-slate-400">Not set</span>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <p className="mb-2 break-words text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Comments
          </p>

          {canEdit ? (
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={10}
              placeholder={`Write your ${title.toLowerCase()} feedback here...`}
              className="min-h-[260px] w-full min-w-0 flex-1 resize-y rounded-3xl border border-slate-200 bg-slate-50/50 p-5 text-sm leading-relaxed text-slate-700 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          ) : (
            <div className="min-h-[260px] w-full min-w-0 flex-1 overflow-y-auto rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700">
              {section?.comments ? (
                <p className="whitespace-pre-wrap break-words">
                  {section.comments}
                </p>
              ) : (
                <p className="italic text-slate-400">No comment yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="break-words text-xs text-slate-400">
              {section ? (
                <>
                  <span className="font-black text-slate-600">
                    {section.authorName}
                  </span>{" "}
                  · {formatDate(section.updatedAt)}
                </>
              ) : (
                <span className="italic">Not submitted yet</span>
              )}
            </p>

            {canEdit && currentUserName && (
              <p className="mt-1 break-words text-xs text-slate-400">
                Saving as{" "}
                <span className="font-black text-slate-600">
                  {currentUserName}
                </span>
              </p>
            )}

            {!canEdit && (
              <p className="mt-1 break-words text-[11px] font-black uppercase tracking-widest text-slate-400">
                Read only
              </p>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isPending || !comments.trim()}
              className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 px-6 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
            >
              {saving || isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {section ? "Update" : "Save Comment"}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function PublicInterviewResultView({
  data,
  session,
  permissions,
}: {
  data: PublicInterviewResultData;
  session: PublicSessionInfo;
  permissions: PublicInterviewPermissions;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!session) {
    if (typeof window !== "undefined") {
      const slug = window.location.pathname.split("/").pop() ?? "";
      window.location.replace(
        `/login?next=${encodeURIComponent(`/interview-result/${slug}`)}`,
      );
    }

    return null;
  }

  type VisibleSection = {
    key: "HR" | "USER_1" | "USER_2";
    title: string;
    assignedTo: string | null;
    section: PublicFeedbackSection;
    canView: boolean;
    canEdit: boolean;
  };

  const visibleSections: VisibleSection[] = (
    [
      {
        key: "HR" as const,
        title: "HR Manager",
        assignedTo: data.assignedReviewers.hr,
        section: data.feedback.hr,
        canView: permissions.canViewHr,
        canEdit: permissions.canEditHr,
      },
      {
        key: "USER_1" as const,
        title: "User 1",
        assignedTo: data.assignedReviewers.user1,
        section: data.feedback.user1,
        canView: permissions.canViewUser1,
        canEdit: permissions.canEditUser1,
      },
      {
        key: "USER_2" as const,
        title: "User 2",
        assignedTo: data.assignedReviewers.user2,
        section: data.feedback.user2,
        canView: permissions.canViewUser2,
        canEdit: permissions.canEditUser2,
      },
    ] as VisibleSection[]
  ).filter((s) => s.canView);

  const sections = visibleSections.map((s) => s.section);

  const rated = sections.filter((s) => s?.rating != null) as Array<
    NonNullable<PublicFeedbackSection>
  >;

  const submittedCount = sections.filter(Boolean).length;
  const totalCount = sections.length;

  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
      : null;

  const recommendCount = rated.filter((s) => {
    const v = (s.recommendation ?? "").toLowerCase();

    return (
      v.includes("hire") ||
      v.includes("recommend") ||
      v.includes("advance") ||
      v.includes("accept") ||
      v.includes("yes")
    );
  }).length;

  const recommendPct =
    rated.length > 0 ? Math.round((recommendCount / rated.length) * 100) : 0;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const stageStyle = getStageStyle(data.application.stage);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 w-screen border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="flex min-h-16 w-full min-w-0 items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-emerald-500/20">
              <Image
                src="/nuanu-logo.png"
                alt="Nuanu"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <p className="break-words text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                Nuanu
              </p>
              <p className="break-words text-base font-black text-slate-950">
                Recruitment · HR
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Interview Assessment
            </span>

            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 lg:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Confidential
            </span>

            <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-[11px] font-black text-white">
                {getInitials(session.name)}
              </div>

              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-[180px] break-words text-xs font-black text-slate-700">
                  {session.name}
                </p>
                <p className="break-words text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {session.isHr ? "HR / Admin" : "Reviewer"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-rose-600 disabled:opacity-50"
                title="Log out"
              >
                {loggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-screen min-w-0 px-5 py-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="w-full min-w-0 bg-gradient-to-r from-white via-white to-emerald-50/50 p-5 lg:p-7">
            <div className="grid w-full min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <TealAvatar name={data.candidate.name} size={78} />

                <div className="min-w-0">
                  <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Candidate
                    </span>

                    <span
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                    >
                      {stageStyle.icon}
                      <span className="break-words">
                        {formatStage(data.application.stage)}
                      </span>
                    </span>
                  </div>

                  <h1 className="break-words text-4xl font-black tracking-tight text-slate-950">
                    {data.candidate.name}
                  </h1>

                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="break-words">
                        {data.application.position}
                      </span>
                    </span>

                    {data.application.location && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="break-words">
                          {data.application.location}
                        </span>
                      </span>
                    )}

                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="break-words">Generated {today}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="break-words text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 break-words text-xl font-black text-slate-950">
                    {formatStage(data.application.status)}
                  </p>
                </div>

                <div className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="break-words text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Stage
                  </p>
                  <p className="mt-1 break-words text-xl font-black text-slate-950">
                    {formatStage(data.application.stage)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mb-6 grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatBlock
            label="Reviewers"
            value={`${submittedCount} / ${totalCount}`}
            icon={<Users className="h-5 w-5" />}
          />

          <StatBlock
            label="Avg Rating"
            value={
              avgRating != null ? (
                <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                  {avgRating.toFixed(2)}
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )
            }
            icon={<Award className="h-5 w-5" />}
          />

          <StatBlock
            label="Recommended"
            value={`${recommendPct}%`}
            icon={<TrendingUp className="h-5 w-5" />}
          />

          <StatBlock
            label="Stage"
            value={formatStage(data.application.stage)}
            icon={<Building2 className="h-5 w-5" />}
          />
        </motion.section>

        <section className="w-full min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="mb-5 grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <h2 className="break-words text-3xl font-black tracking-tight text-slate-950">
                Reviewer Feedback
              </h2>

              <p className="mt-1 break-words text-sm leading-relaxed text-slate-500">
                {visibleSections.length === 3
                  ? "Detailed assessment from each interview panel member."
                  : visibleSections.length === 1
                    ? "Your interview assessment for this candidate."
                    : "Detailed assessment from the visible reviewer(s)."}
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 text-xs xl:justify-end">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 shadow-sm">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="break-words">
                  Signed in as{" "}
                  <strong className="font-black text-slate-800">
                    {session.name}
                  </strong>
                </span>
              </span>

              {session.isHr ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-black text-emerald-700">
                  HR / Admin — edit access
                </span>
              ) : session.isAssignedReviewer ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-black text-emerald-700">
                  Assigned reviewer — edit own section
                </span>
              ) : (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-black text-amber-700">
                  Read only
                </span>
              )}
            </div>
          </motion.div>

          {visibleSections.length === 0 ? (
            <div className="flex w-full min-w-0 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
                <ShieldCheck className="h-8 w-8 text-slate-300" />
              </div>

              <p className="break-words text-base font-black text-slate-700">
                No interviewer feedback is visible to you for this candidate.
              </p>

              <p className="break-words text-sm text-slate-400">
                If you believe this is a mistake, please contact the HR team.
              </p>
            </div>
          ) : (
            <div
              className={`grid w-full min-w-0 items-stretch gap-5 ${
                visibleSections.length === 1
                  ? "grid-cols-1"
                  : visibleSections.length === 2
                    ? "grid-cols-1 xl:grid-cols-2"
                    : "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
              }`}
            >
              {visibleSections.map((section, index) => (
                <EditableReviewerCard
                  key={section.key}
                  title={section.title}
                  assignedTo={section.assignedTo}
                  section={section.section}
                  applicationId={data.applicationId}
                  reviewerType={section.key}
                  canEdit={section.canEdit}
                  currentUserName={session.name}
                  index={index}
                  onSaved={handleRefresh}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="w-screen border-t border-slate-200 bg-white px-5 py-4 text-xs text-slate-400 lg:px-8">
        <div className="flex w-full min-w-0 flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="flex min-w-0 items-center gap-1.5 break-words">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="break-words">
              This is a confidential interview assessment shared by the Nuanu HR
              team. Please do not redistribute.
            </span>
          </p>

          <p className="flex shrink-0 items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Generated on {today}
          </p>
        </div>
      </footer>
    </div>
  );
}
