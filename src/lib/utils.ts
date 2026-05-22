import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** SEEK-style relative time, e.g. "28 minutes ago", "3 hours ago" */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const ts = d.getTime();
  if (Number.isNaN(ts)) return "—";

  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  return formatDate(d);
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateCode(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export const PIPELINE_STAGES = [
  { id: "talent_bank",     label: "Talent Bank",          color: "#64748B" },
  { id: "screening",       label: "Screening",            color: "#8B5CF6" },
  { id: "hr_interview",    label: "HR Interview",         color: "#3B82F6" },
  { id: "user_interview",  label: "User Interview",       color: "#0EA5E9" },
  { id: "assessment",      label: "Assessment",           color: "#06B6D4" },
  { id: "user_interview_2",label: "User Interview II",    color: "#14B8A6" },
  { id: "offering",        label: "Offering",             color: "#F59E0B" },
  { id: "hired",           label: "Hired",                color: "#22C55E" },
  { id: "rejected",        label: "Rejected",             color: "#EF4444" },
  { id: "onboarding",      label: "Onboarding",           color: "#84CC16" },
] as const;

export type PipelineStageId = typeof PIPELINE_STAGES[number]["id"];

export const PIPELINE_STAGE_IDS = PIPELINE_STAGES.map((s) => s.id);

/** Map legacy DB stage slugs to canonical pipeline column IDs */
export const LEGACY_STAGE_TO_PIPELINE: Record<string, PipelineStageId> = {
  applied: "talent_bank",
  phone_screening: "screening",
  interview_1: "hr_interview",
  interview_2: "user_interview",
  final_interview: "user_interview_2",
  offer: "offering",
  withdrawn: "rejected",
  shortlisted: "screening",
  tech_interview: "user_interview",
};

export function normalizePipelineStage(stage: string): string {
  const key = stage.toLowerCase().trim();
  if (PIPELINE_STAGE_IDS.includes(key as PipelineStageId)) return key;
  return LEGACY_STAGE_TO_PIPELINE[key] ?? key;
}

export function resolvePipelineColumn(stage: string): PipelineStageId {
  const normalized = normalizePipelineStage(stage);
  if (PIPELINE_STAGE_IDS.includes(normalized as PipelineStageId)) {
    return normalized as PipelineStageId;
  }
  return "talent_bank";
}

export const SOURCE_PRESET_OPTIONS = [
  { value: "seek", label: "SEEK" },
  { value: "career_page", label: "Career Page" },
  { value: "direct", label: "Direct" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "walk_in", label: "Walk-In" },
  { value: "referral", label: "Referral" },
  { value: "job_board", label: "Job Board" },
  { value: "other", label: "Other" },
] as const;

export const VACANCY_STATUSES = [
  { id: "draft", label: "Draft", color: "#94A3B8" },
  { id: "pending_approval", label: "Pending Approval", color: "#F59E0B" },
  { id: "approved", label: "Approved", color: "#22C55E" },
  { id: "published", label: "Published", color: "#3B82F6" },
  { id: "closed", label: "Closed", color: "#EF4444" },
  { id: "on_hold", label: "On Hold", color: "#8B5CF6" },
] as const;

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  HR_ADMIN: "hr_admin",
  RECRUITER: "recruiter",
  HIRING_MANAGER: "hiring_manager",
  INTERVIEWER: "interviewer",
  FINANCE: "finance",
  EMPLOYEE: "employee",
} as const;
