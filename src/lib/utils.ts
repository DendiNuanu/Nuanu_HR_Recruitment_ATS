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
  { id: "applied",         label: "Applied",              color: "#6366F1" },
  { id: "screening",       label: "CV Screening",         color: "#8B5CF6" },
  { id: "phone_screening", label: "Phone Screening",      color: "#A855F7" },
  { id: "assessment",      label: "Assessment",           color: "#3B82F6" },
  { id: "interview_1",     label: "Interview 1",          color: "#0EA5E9" },
  { id: "interview_2",     label: "Interview 2",          color: "#06B6D4" },
  { id: "offering",        label: "Offering",             color: "#F59E0B" },
  { id: "medical_check",   label: "Medical Check Up",     color: "#F97316" },
  { id: "onboarding",      label: "Onboarding",           color: "#84CC16" },
  { id: "hired",           label: "Hired",                color: "#22C55E" },
  { id: "withdrawn",       label: "Withdrawn / Rejected", color: "#94A3B8" },
] as const;

export type PipelineStageId = typeof PIPELINE_STAGES[number]["id"];

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
