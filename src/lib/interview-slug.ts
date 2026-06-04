import { prisma } from "@/lib/prisma";

/**
 * Slugify a candidate name for the public Interview Result URL.
 * - Lowercases, replaces runs of non-alphanumeric chars with a single dash
 * - Trims leading/trailing dashes
 * - Falls back to "candidate" when the result is empty (e.g. names that are
 *   entirely punctuation or non-ASCII letters we don't preserve)
 */
export function slugifyName(raw: string | null | undefined): string {
  const base = (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "candidate";
}

/** Take the first 4 lowercase alphanumeric characters of a CUID/uuid. */
function shortSuffix(id: string): string {
  const clean = (id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (clean || "0000").slice(0, 4);
}

/**
 * Generate a unique interviewSlug for a candidate.
 *
 *   - First tries `<slugifyName(name)>`
 *   - On collision, appends `-<shortSuffix(id)>` (e.g. `ikhsan-maulana-a3f2`)
 *   - Final fallback: appends a random 4-char tail
 *
 * Pass `existingSlug` (the candidate's current value) to avoid an unnecessary
 * DB roundtrip when the slug is already valid.
 */
export async function generateInterviewSlug(
  name: string | null | undefined,
  id: string,
  existingSlug?: string | null,
): Promise<string> {
  const base = slugifyName(name);
  const tail = shortSuffix(id);
  const candidates = [base, `${base}-${tail}`, `${base}-${randomTail()}`];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (existingSlug && candidate === existingSlug) return candidate;
    // Cheap pre-check: anyone else with this slug? Excludes self.
    const clash = await prisma.user.findFirst({
      where: { interviewSlug: candidate, NOT: { id } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  // Last resort: include the full id slice to guarantee uniqueness.
  return `${base}-${id.slice(0, 4).toLowerCase()}-${randomTail()}`;
}

function randomTail(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Persist an interviewSlug for the given candidate, but only if one isn't
 * already set. Wrapped so callers can await it without ever throwing —
 * a slug failure must never block candidate creation or updates.
 */
export async function ensureInterviewSlug(
  userId: string,
  name: string | null | undefined,
): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, interviewSlug: true },
    });
    if (!user) return null;
    if (user.interviewSlug) return user.interviewSlug;

    const slug = await generateInterviewSlug(
      name ?? user.name,
      user.id,
      user.interviewSlug,
    );
    await prisma.user.update({
      where: { id: userId },
      data: { interviewSlug: slug },
    });
    return slug;
  } catch (err) {
    console.warn(
      "[interview-slug] ensureInterviewSlug failed (non-fatal):",
      err,
    );
    return null;
  }
}
