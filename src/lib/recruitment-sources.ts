/**
 * Normalize recruitment channel/source values for storage keys and UI labels.
 * Jobstreet and SEEK are the same channel — always display as "SEEK".
 */

const EXCLUDED_SOURCE_KEYS = new Set(["github jobs", "github_jobs", "github"]);

/** Map raw DB / form values to a canonical channel key. */
export function normalizeSourceKey(source: string | null | undefined): string {
  const raw = (source ?? "direct").trim().toLowerCase();
  if (!raw) return "direct";
  if (EXCLUDED_SOURCE_KEYS.has(raw) || raw.includes("github")) return "";
  if (raw === "jobstreet" || raw === "seek") return "seek";
  return raw.replace(/\s+/g, "_");
}

/** Human-readable label for dashboards and tables. */
export function formatSourceLabel(source: string | null | undefined): string {
  const key = normalizeSourceKey(source);
  if (!key) return "";
  if (key === "seek") return "SEEK";
  if (key === "career_page" || key === "careers page") return "Careers page";
  if (key === "hr_upload" || key === "hr upload") return "HR upload";
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isExcludedSource(source: string | null | undefined): boolean {
  return normalizeSourceKey(source) === "";
}

/** Estimated IDR cost per hire by canonical channel key. */
export const CHANNEL_COST_IDR: Record<string, number> = {
  referral: 0,
  direct: 0,
  internal: 0,
  linkedin: 5_000_000,
  seek: 3_000_000,
  loker_bali: 1_000_000,
  career_page: 0,
  other: 500_000,
};

export function getChannelCost(channel: string): number {
  const key = normalizeSourceKey(channel) || "other";
  return CHANNEL_COST_IDR[key] ?? CHANNEL_COST_IDR.other;
}
