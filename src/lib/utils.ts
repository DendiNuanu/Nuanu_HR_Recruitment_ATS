import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  { id: "applied", label: "Applied", color: "#6366F1" },
  { id: "screening", label: "Screening", color: "#8B5CF6" },
  { id: "hr_interview", label: "HR Interview", color: "#3B82F6" },
  { id: "user_interview", label: "User Interview", color: "#0EA5E9" },
  { id: "final_interview", label: "Final Interview", color: "#14B8A6" },
  { id: "offer", label: "Offer", color: "#F59E0B" },
  { id: "hired", label: "Hired", color: "#22C55E" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
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
