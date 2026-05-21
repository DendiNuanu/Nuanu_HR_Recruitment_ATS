/**
 * POST /api/candidates/import-seek — batch import from SEEK Employer scraper
 * GET  /api/candidates/import-seek — health check (x-api-key)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { delCache } from "@/lib/cache";

const IMPORT_SECRET = process.env.SEEK_IMPORT_KEY;

type SeekCandidateInput = {
  name?: string;
  email?: string;
  phone?: string;
  appliedRole?: string;
  mostRecentRole?: string;
  seekStatus?: string;
  location?: string;
  resumeUrl?: string;
  experience?: string | number;
  appliedAt?: string;
  vacancyId?: string;
  profileUrl?: string;
};

type ImportResults = {
  imported: number;
  skipped: number;
  errors: number;
  details: string[];
};

const SEEK_STAGE_MAP: Record<string, string> = {
  New: "applied",
  Inbox: "applied",
  Suitable: "screening",
  "Not Suitable": "rejected",
  "Not suitable": "rejected",
  Interviewed: "interview_1",
  Offered: "offering",
  Hired: "hired",
  Withdrawn: "withdrawn",
};

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("x-api-key");
  return Boolean(IMPORT_SECRET && authHeader === IMPORT_SECRET);
}

function mapSeekStatus(seekStatus: string | undefined): string {
  if (!seekStatus) return "applied";
  const trimmed = seekStatus.trim();
  return SEEK_STAGE_MAP[trimmed] ?? SEEK_STAGE_MAP[trimmed.replace(/\s+/g, " ")] ?? "applied";
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "").trim();
  return cleaned || null;
}

function parseExperienceYears(experience: string | number | undefined): number | undefined {
  if (experience == null) return undefined;
  if (typeof experience === "number" && !Number.isNaN(experience)) return experience;
  const match = String(experience).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function applicationStatusForStage(stage: string): string {
  if (stage === "rejected" || stage === "withdrawn") return stage;
  if (stage === "hired") return "hired";
  return "active";
}

const SEEK_ROLE_VACANCY_ENV: Record<string, string | undefined> = {
  "site manager": process.env.SEEK_VACANCY_SITE_MANAGER,
  "accounting officer": process.env.SEEK_VACANCY_ACCOUNTING_OFFICER,
  "safety officer": process.env.SEEK_VACANCY_SAFETY_OFFICER,
};

async function resolveVacancyId(
  vacancyId: string | undefined,
  appliedRole: string | undefined,
): Promise<string | null> {
  if (vacancyId) {
    const byId = await prisma.vacancy.findFirst({
      where: { id: vacancyId, deletedAt: null },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  const role = appliedRole?.trim();
  if (role) {
    const envId = SEEK_ROLE_VACANCY_ENV[role.toLowerCase()];
    if (envId) {
      const mapped = await prisma.vacancy.findFirst({
        where: { id: envId, deletedAt: null },
        select: { id: true },
      });
      if (mapped) return mapped.id;
    }

    const exact = await prisma.vacancy.findFirst({
      where: { deletedAt: null, title: { equals: role, mode: "insensitive" } },
      select: { id: true },
    });
    if (exact) return exact.id;

    const contains = await prisma.vacancy.findFirst({
      where: {
        deletedAt: null,
        title: { contains: role, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (contains) return contains.id;

    return null;
  }

  const fallback = await prisma.vacancy.findFirst({
    where: { status: "published", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

async function findExistingUser(
  email: string | null,
  phone: string | null,
): Promise<{ id: string; email: string } | null> {
  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (byEmail) return byEmail;
  }

  if (phone) {
    const byPhone = await prisma.user.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true, email: true },
    });
    if (byPhone) return byPhone;
  }

  return null;
}

/** Stable id from phone when SEEK list has no email — not a random throwaway per import. */
function resolveImportEmail(raw: SeekCandidateInput, phone: string | null): string | null {
  const explicit = raw.email?.trim().toLowerCase();
  if (explicit && !explicit.includes("@noemail") && !explicit.includes("@import.")) {
    return explicit;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) return `seek+${digits}@import.nuanu.local`;
  }
  return null;
}

async function importOneCandidate(
  raw: SeekCandidateInput,
  defaultVacancyId: string | null,
): Promise<"imported" | "skipped" | "error"> {
  const name = raw.name?.trim() || "Unknown";
  const phone = normalizePhone(raw.phone);
  const email = resolveImportEmail(raw, phone);

  if (!email) {
    throw new Error("Candidate needs a phone number (email not shown on SEEK list page)");
  }
  const stage = mapSeekStatus(raw.seekStatus);
  const appliedAt = raw.appliedAt ? new Date(raw.appliedAt) : new Date();
  const seekAppliedRole = raw.appliedRole?.trim() || null;
  const currentEmployment = raw.mostRecentRole?.trim() || null;
  const experienceYears = parseExperienceYears(raw.experience);

  const vacancyId =
    (await resolveVacancyId(raw.vacancyId, seekAppliedRole ?? undefined)) ??
    (seekAppliedRole ? null : defaultVacancyId);

  if (!vacancyId) {
    const hint = seekAppliedRole
      ? `No ATS job matches SEEK role "${seekAppliedRole}". Create a vacancy with that title or set SEEK_VACANCY_SITE_MANAGER / SEEK_VACANCY_ACCOUNTING_OFFICER in Vercel env.`
      : "No vacancy found (publish a vacancy or set appliedRole from SEEK)";
    throw new Error(hint);
  }

  const existingUser = await findExistingUser(
    raw.email?.trim() && !raw.email.includes("@noemail") ? email : null,
    phone,
  );

  if (existingUser) {
    const existingApp = await prisma.application.findFirst({
      where: { candidateId: existingUser.id, vacancyId, deletedAt: null },
      select: { id: true },
    });
    if (existingApp) {
      return "skipped";
    }
  }

  const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      ...(phone ? { phone } : {}),
    },
    create: {
      email,
      password: randomPassword,
      name,
      ...(phone ? { phone } : {}),
    },
    select: { id: true },
  });

  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      ...(raw.location ? { location: raw.location.trim() } : {}),
      ...(raw.resumeUrl ? { resumeUrl: raw.resumeUrl } : {}),
      ...(currentEmployment ? { currentTitle: currentEmployment } : {}),
      ...(seekAppliedRole ? { referPosition: seekAppliedRole } : {}),
      ...(raw.mostRecentRole ? { currentCompany: raw.mostRecentRole.trim() } : {}),
      ...(experienceYears != null ? { experienceYears } : {}),
      ...(typeof raw.experience === "string" && raw.experience.trim()
        ? { summary: raw.experience.trim() }
        : {}),
    },
    create: {
      userId: user.id,
      location: raw.location?.trim() || "Bali, Indonesia",
      ...(raw.resumeUrl ? { resumeUrl: raw.resumeUrl } : {}),
      ...(currentEmployment ? { currentTitle: currentEmployment } : {}),
      ...(seekAppliedRole ? { referPosition: seekAppliedRole } : {}),
      ...(raw.mostRecentRole ? { currentCompany: raw.mostRecentRole.trim() } : {}),
      ...(experienceYears != null ? { experienceYears } : {}),
      ...(typeof raw.experience === "string" && raw.experience.trim()
        ? { summary: raw.experience.trim() }
        : {}),
    },
  });

  const application = await prisma.application.create({
    data: {
      vacancyId,
      candidateId: user.id,
      source: "SEEK",
      status: applicationStatusForStage(stage),
      currentStage: stage,
      appliedAt: Number.isNaN(appliedAt.getTime()) ? new Date() : appliedAt,
      ...(stage === "rejected" ? { rejectedAt: new Date() } : {}),
    },
  });

  const existingScore = await prisma.candidateScore.findUnique({
    where: { applicationId: application.id },
  });
  if (!existingScore) {
    await prisma.candidateScore.create({
      data: { applicationId: application.id, overallScore: 50 },
    });
  }

  if (raw.resumeUrl) {
    await prisma.document.create({
      data: {
        applicationId: application.id,
        name: `CV - ${name}`,
        type: "resume",
        fileUrl: raw.resumeUrl,
        mimeType: "application/pdf",
      },
    });
  }

  return "imported";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ok",
    message: "SEEK import endpoint is live",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { candidates?: SeekCandidateInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidates = body.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: "No candidates provided" }, { status: 400 });
  }

  const results: ImportResults = {
    imported: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const defaultVacancyId = await resolveVacancyId(undefined, undefined);

  for (const candidate of candidates) {
    const label = candidate.name?.trim() || candidate.email || "Unknown";
    try {
      const outcome = await importOneCandidate(candidate, defaultVacancyId);
      if (outcome === "skipped") {
        results.skipped++;
        results.details.push(`SKIP: ${label} (already exists)`);
      } else {
        results.imported++;
        const stage = mapSeekStatus(candidate.seekStatus);
        results.details.push(`OK: ${label} → stage: ${stage}`);
      }
    } catch (err: unknown) {
      results.errors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      results.details.push(`ERROR: ${label} — ${message}`);
    }
  }

  await delCache("dashboard_metrics");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/pipeline");

  return NextResponse.json({
    success: true,
    message: `Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`,
    results,
  });
}
