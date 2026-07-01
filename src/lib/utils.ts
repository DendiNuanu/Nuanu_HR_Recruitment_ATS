import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BALI_TZ = "Asia/Makassar";

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BALI_TZ,
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BALI_TZ,
  }).format(d);
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
  { id: "new", label: "New", color: "#38BDF8" },
  { id: "talent_bank", label: "Talent Bank", color: "#64748B" },
  { id: "screening", label: "Screening", color: "#8B5CF6" },
  { id: "hr_interview", label: "HR Interview", color: "#3B82F6" },
  { id: "user_interview", label: "User Interview", color: "#0EA5E9" },
  { id: "assessment", label: "Assessment", color: "#06B6D4" },
  { id: "user_interview_2", label: "User Interview II", color: "#14B8A6" },
  { id: "offering", label: "Offering", color: "#F59E0B" },
  { id: "hired", label: "Hired", color: "#22C55E" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
  { id: "onboarding", label: "Onboarding", color: "#84CC16" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const PIPELINE_STAGE_IDS = PIPELINE_STAGES.map((s) => s.id);

/** Map legacy DB stage slugs to canonical pipeline column IDs */
export const LEGACY_STAGE_TO_PIPELINE: Record<string, PipelineStageId> = {
  applied: "new",
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
  return "new";
}

/**
 * Maximum number of "Refer As" positions HR can assign to a candidate.
 * Stored as a JSON-encoded array string in CandidateProfile.referPosition.
 */
export const MAX_REFER_POSITIONS = 3;

/**
 * Parse the stored `referPosition` value (a JSON array string, e.g.
 * '["Legal Admin","HR Admin"]') into a string array. Backward compatible:
 * legacy single-string values (e.g. "Legal Admin") are wrapped into a
 * one-element array. Always returns an array padded/truncated to
 * MAX_REFER_POSITIONS so the UI can render a fixed number of inputs.
 */
export function parseReferPositions(
  raw: string | null | undefined,
): string[] {
  const fallback = Array(MAX_REFER_POSITIONS).fill("");
  if (!raw) return [...fallback];

  const trimmed = raw.trim();
  if (!trimmed) return [...fallback];

  // New format: JSON array
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const positions = parsed
          .map((p) => (typeof p === "string" ? p : String(p ?? "")))
          .map((p) => p.trim());
        const padded = [...positions];
        while (padded.length < MAX_REFER_POSITIONS) padded.push("");
        return padded.slice(0, MAX_REFER_POSITIONS);
      }
    } catch {
      // fall through to legacy handling
    }
  }

  // Legacy format: a single position string
  return [trimmed, "", ""].slice(0, MAX_REFER_POSITIONS);
}

/**
 * Serialize a string array of positions into the JSON array string stored in
 * `CandidateProfile.referPosition`. Empty/whitespace-only entries are
 * dropped. Returns `null` when no positions remain so the DB column stays
 * nullable (and legacy readers treat null as "not set").
 */
export function serializeReferPositions(positions: string[]): string | null {
  const cleaned = (positions ?? [])
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}

/**
 * Return the first non-empty "Refer As" position, or null. Useful for places
 * that only need a single display label (e.g. list tables, AI scoring).
 */
export function firstReferPosition(
  raw: string | null | undefined,
): string | null {
  const positions = parseReferPositions(raw);
  return positions.find((p) => p.trim().length > 0) ?? null;
}

export const SOURCE_PRESET_OPTIONS = [
  { value: "seek", label: "SEEK" },
  { value: "career_page", label: "Career Page" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "direct", label: "Direct" },
  { value: "walk_in", label: "Walk-In" },
  { value: "referral", label: "Referral" },
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
