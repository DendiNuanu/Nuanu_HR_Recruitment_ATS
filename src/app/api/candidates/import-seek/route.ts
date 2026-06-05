/**
 * POST /api/candidates/import-seek — batch import from SEEK Employer scraper
 * GET  /api/candidates/import-seek — health check (x-api-key)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { delCache } from "@/lib/cache";
import { guessResumeMimeType, uploadResumeBase64 } from "@/lib/resume-storage";

const IMPORT_SECRET = process.env.SEEK_IMPORT_KEY;

type SeekCandidateInput = {
  name?: string;
  email?: string;
  phone?: string;
  appliedRole?: string;
  mostRecentRole?: string;
  seekStatus?: string;
  location?: string;
  domicile?: string;
  resumeUrl?: string;
  /** Base64-encoded CV from SEEK scraper (uploaded to Supabase on import) */
  resumeBase64?: string;
  resumeFileName?: string;
  resumeMimeType?: string;
  experience?: string | number;
  appliedAt?: string;
  vacancyId?: string;
  profileUrl?: string;
  /** SEEK profile ID extracted from profileUrl (e.g. "301d56f4-d3c5-45bd-...") */
  seekProfileId?: string;
  /** Raw expected salary string from SEEK profile tab */
  expectedSalaryRaw?: string;
  /** Normalised salary display string e.g. "IDR 4,000,000 / month" */
  salaryExpectation?: string;
};

type ImportResults = {
  imported: number;
  skipped: number;
  errors: number;
  details: string[];
};

// ── Status priority: higher number = higher priority (never downgrade) ─────
// A "rejected" candidate stays rejected even if SEEK still shows them as "new"
const STAGE_PRIORITY: Record<string, number> = {
  hired: 6,
  offering: 5,
  hr_interview: 4,
  screening: 3,
  rejected: 2,
  talent_bank: 1,
  new: 0,
};

/** Returns true if newStage is allowed to overwrite existingStage */
function stageCanOverwrite(existingStage: string, newStage: string): boolean {
  const existPriority = STAGE_PRIORITY[existingStage] ?? 0;
  const newPriority = STAGE_PRIORITY[newStage] ?? 0;
  // Never downgrade: only allow if new stage is strictly higher priority
  // Exception: allow same-priority updates (e.g. new → new keeps appliedAt fresh)
  return newPriority >= existPriority;
}

const SEEK_STAGE_MAP: Record<string, string> = {
  New: "new",
  Inbox: "new",
  "Talent Bank": "talent_bank",
  "Talent bank": "talent_bank",
  TalentBank: "talent_bank",
  Prescreen: "screening",
  Shortlist: "screening",
  Suitable: "screening",
  "Not Suitable": "rejected",
  "Not suitable": "rejected",
  Interview: "hr_interview",
  Interviewed: "hr_interview",
  Offer: "offering",
  Offered: "offering",
  Accept: "hired",
  Hired: "hired",
  Withdrawn: "rejected",
};

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("x-api-key");
  return Boolean(IMPORT_SECRET && authHeader === IMPORT_SECRET);
}

function mapSeekStatus(seekStatus: string | undefined): string {
  if (!seekStatus) return "new";
  const trimmed = seekStatus.trim();
  return (
    SEEK_STAGE_MAP[trimmed] ??
    SEEK_STAGE_MAP[trimmed.replace(/\s+/g, " ")] ??
    "new"
  );
}

/** Parse SEEK relative applied strings when scraper sends "3 hours ago" */
function parseSeekAppliedAt(raw: string | undefined): Date {
  if (!raw?.trim()) return new Date();
  const s = raw.trim().toLowerCase();
  const now = new Date();
  if (s === "today") return now;
  if (s === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }
  const m = s.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const d = new Date(now);
    if (unit.startsWith("minute")) d.setMinutes(d.getMinutes() - n);
    else if (unit.startsWith("hour")) d.setHours(d.getHours() - n);
    else if (unit.startsWith("day")) d.setDate(d.getDate() - n);
    else if (unit.startsWith("week")) d.setDate(d.getDate() - n * 7);
    else if (unit.startsWith("month")) d.setMonth(d.getMonth() - n);
    return d;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "").trim();
  return cleaned || null;
}

function parseExperienceYears(
  experience: string | number | undefined,
): number | undefined {
  if (experience == null) return undefined;
  if (typeof experience === "number" && !Number.isNaN(experience))
    return experience;
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

const SEEK_AUTO_CREATE_VACANCIES =
  process.env.SEEK_AUTO_CREATE_VACANCIES !== "false";

function seekVacancyCode(role: string): string {
  const slug = role
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `SEEK-${slug || "ROLE"}`;
}

async function getSeekImportDefaults(): Promise<{
  creatorId: string;
  departmentId: string;
} | null> {
  const admin =
    (await prisma.user.findFirst({
      where: { email: "admin@nuanu.com", deletedAt: null },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: {
        deletedAt: null,
        userRoles: { some: { role: { slug: "super-admin" } } },
      },
      select: { id: true },
    }));

  const department = await prisma.department.findFirst({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!admin?.id || !department?.id) return null;
  return { creatorId: admin.id, departmentId: department.id };
}

async function createVacancyForSeekRole(role: string): Promise<string> {
  const defaults = await getSeekImportDefaults();
  if (!defaults) {
    throw new Error(
      "Cannot auto-create vacancy: ATS needs at least one department and an admin user",
    );
  }

  const baseCode = seekVacancyCode(role);
  let code = baseCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    const taken = await prisma.vacancy.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) break;
    code = `${baseCode}-${Date.now().toString(36).slice(-5)}${attempt}`;
  }

  const vacancy = await prisma.vacancy.create({
    data: {
      title: role,
      code,
      departmentId: defaults.departmentId,
      creatorId: defaults.creatorId,
      status: "published",
      publishedAt: new Date(),
      isApproved: true,
      description: `Imported from SEEK Employer (${role}). Applications sync via the SEEK scraper.`,
      location: "Bali, Indonesia",
      employmentType: "full-time",
      locationType: "onsite",
      currency: "IDR",
      skills: [],
    },
    select: { id: true, title: true },
  });

  return vacancy.id;
}

/** Find existing vacancy or create a published one for this SEEK role title. */
async function ensureVacancyForSeekRole(
  explicitVacancyId: string | undefined,
  appliedRole: string | undefined,
): Promise<{ vacancyId: string; created: boolean; title: string } | null> {
  const existing = await resolveVacancyId(explicitVacancyId, appliedRole);
  if (existing) {
    const row = await prisma.vacancy.findFirst({
      where: { id: existing, deletedAt: null },
      select: { title: true },
    });
    return {
      vacancyId: existing,
      created: false,
      title: row?.title ?? appliedRole ?? "Vacancy",
    };
  }

  const role = appliedRole?.trim();
  if (!role) {
    const fallback = await resolveVacancyId(undefined, undefined);
    if (!fallback) return null;
    const row = await prisma.vacancy.findFirst({
      where: { id: fallback, deletedAt: null },
      select: { title: true },
    });
    return {
      vacancyId: fallback,
      created: false,
      title: row?.title ?? "Vacancy",
    };
  }

  if (!SEEK_AUTO_CREATE_VACANCIES) return null;

  const vacancyId = await createVacancyForSeekRole(role);
  return { vacancyId, created: true, title: role };
}

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
  seekProfileId: string | null,
): Promise<{ id: string; email: string } | null> {
  // 1. Match by SEEK profile ID (most stable identity key)
  if (seekProfileId) {
    const bySeekId = await prisma.candidateProfile.findFirst({
      where: { seekProfileId },
      select: { userId: true },
    });
    if (bySeekId?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: bySeekId.userId },
        select: { id: true, email: true },
      });
      if (user) return user;
    }
  }

  // 2. Match by email
  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (byEmail) return byEmail;
  }

  // 3. Match by phone
  if (phone) {
    const byPhone = await prisma.user.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true, email: true },
    });
    if (byPhone) return byPhone;
  }

  return null;
}

async function resolveSeekResumeUrl(
  raw: SeekCandidateInput,
): Promise<string | null> {
  if (raw.resumeUrl?.trim()) return raw.resumeUrl.trim();

  if (!raw.resumeBase64?.trim()) return null;

  const fileName =
    raw.resumeFileName?.trim() ||
    `${(raw.name || "candidate").replace(/\s+/g, "_")}_resume.pdf`;

  return uploadResumeBase64(
    raw.resumeBase64,
    fileName,
    raw.resumeMimeType || guessResumeMimeType(fileName),
  );
}

async function attachResumeToCandidate(
  userId: string,
  applicationId: string,
  resumeUrl: string,
  candidateName: string,
  mimeType: string,
): Promise<void> {
  await prisma.candidateProfile.update({
    where: { userId },
    data: { resumeUrl },
  });

  const existingDoc = await prisma.document.findFirst({
    where: { applicationId, type: "resume" },
    select: { id: true },
  });

  if (!existingDoc) {
    await prisma.document.create({
      data: {
        applicationId,
        name: `CV - ${candidateName}`,
        type: "resume",
        fileUrl: resumeUrl,
        mimeType,
      },
    });
  } else {
    await prisma.document.update({
      where: { id: existingDoc.id },
      data: { fileUrl: resumeUrl, mimeType },
    });
  }
}

/** Stable id from phone when SEEK list has no email — not a random throwaway per import. */
function resolveImportEmail(
  raw: SeekCandidateInput,
  phone: string | null,
): string | null {
  const explicit = raw.email?.trim().toLowerCase();
  if (
    explicit &&
    !explicit.includes("@noemail") &&
    !explicit.includes("@import.")
  ) {
    return explicit;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) return `seek+${digits}@import.nuanu.local`;
  }
  return null;
}

/** Extract SEEK profile UUID from a profile URL like ...?selected=301d56f4-... */
function extractSeekProfileId(profileUrl: string | undefined): string | null {
  if (!profileUrl) return null;
  const m = profileUrl.match(/[?&]selected=([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

/** Detect email/location mismatch between SEEK profile and stored CV data */
function detectMismatches(
  seekEmail: string | null,
  storedEmail: string | null,
  seekLocation: string | null,
  storedLocation: string | null,
): string[] {
  const mismatches: string[] = [];
  if (
    seekEmail &&
    storedEmail &&
    seekEmail.toLowerCase() !== storedEmail.toLowerCase() &&
    !storedEmail.includes("@import.nuanu.local")
  ) {
    mismatches.push(`email: SEEK="${seekEmail}" vs stored="${storedEmail}"`);
  }
  if (
    seekLocation &&
    storedLocation &&
    seekLocation.toLowerCase() !== storedLocation.toLowerCase()
  ) {
    mismatches.push(
      `location: SEEK="${seekLocation}" vs stored="${storedLocation}"`,
    );
  }
  return mismatches;
}

async function importOneCandidate(raw: SeekCandidateInput): Promise<
  | {
      status: "imported";
      vacancyCreated: boolean;
      vacancyTitle: string;
      resumeAttached: boolean;
      stageLocked: boolean;
    }
  | { status: "skipped"; resumeAttached: boolean; stageLocked: boolean }
> {
  // ── FIX 6: Validate required fields before doing anything ─────────────────
  const name = raw.name?.trim() || "Unknown";
  if (!name || name === "Unknown") {
    throw new Error("Candidate name is required");
  }

  const phone = normalizePhone(raw.phone);
  const email = resolveImportEmail(raw, phone);

  if (!email) {
    throw new Error(
      "Candidate needs a phone number (email not shown on SEEK list page)",
    );
  }

  // ── FIX 2: Stable identity key — prefer seekProfileId ────────────────────
  const seekProfileId =
    raw.seekProfileId?.trim() ||
    extractSeekProfileId(raw.profileUrl) ||
    null;

  const mappedStage = mapSeekStatus(raw.seekStatus);
  const appliedAt = parseSeekAppliedAt(raw.appliedAt);

  // ── FIX 3: Store SEEK location separately from CV location ────────────────
  const seekLocation = raw.domicile?.trim() || raw.location?.trim() || null;
  const seekAppliedRole = raw.appliedRole?.trim() || null;
  const currentEmployment = raw.mostRecentRole?.trim() || null;
  const experienceYears = parseExperienceYears(raw.experience);

  // ── FIX 4: Salary — normalised string from scraper ────────────────────────
  // scraper sets `salaryExpectation` (formatted) + `expectedSalaryRaw` (raw text)
  const salaryExpectation =
    raw.salaryExpectation?.trim() ||
    (raw.expectedSalaryRaw?.trim()
      ? `RAW: ${raw.expectedSalaryRaw.trim()}`
      : null);

  const ensured = await ensureVacancyForSeekRole(
    raw.vacancyId,
    seekAppliedRole ?? undefined,
  );

  if (!ensured?.vacancyId) {
    throw new Error(
      seekAppliedRole
        ? `Could not find or create vacancy for SEEK role "${seekAppliedRole}"`
        : "No vacancy found and none could be auto-created",
    );
  }

  const { vacancyId, created: vacancyCreated, title: vacancyTitle } = ensured;

  const resumeUrl = await resolveSeekResumeUrl(raw);
  const resumeMimeType = guessResumeMimeType(
    raw.resumeFileName || `${name}_resume.pdf`,
  );

  // ── FIX 2: Find existing user by seekProfileId → email → phone ────────────
  const existingUser = await findExistingUser(
    raw.email?.trim() && !raw.email.includes("@noemail") ? email : null,
    phone,
    seekProfileId,
  );

  if (existingUser) {
    const existingApp = await prisma.application.findFirst({
      where: { candidateId: existingUser.id, vacancyId, deletedAt: null },
      select: { id: true, currentStage: true },
    });

    if (existingApp) {
      // ── FIX 1: Status lock — never downgrade (rejected stays rejected) ────
      const existingStage = existingApp.currentStage;
      const stageLocked = !stageCanOverwrite(existingStage, mappedStage);

      if (!stageLocked) {
        await prisma.application.update({
          where: { id: existingApp.id },
          data: {
            currentStage: mappedStage,
            status: applicationStatusForStage(mappedStage),
            appliedAt,
            lastActivityAt: new Date(),
            ...(mappedStage === "rejected" ? { rejectedAt: new Date() } : {}),
          },
        });
      }

      // Always update profile metadata on re-scrape (but never downgrade location)
      const existingProfile = await prisma.candidateProfile.findUnique({
        where: { userId: existingUser.id },
        select: {
          resumeUrl: true,
          location: true,
          domicile: true,
          seekProfileId: true,
        },
      });

      // ── FIX 3: Detect email/location mismatches ───────────────────────────
      const mismatches = detectMismatches(
        raw.email?.trim() || null,
        existingUser.email,
        seekLocation,
        existingProfile?.location || null,
      );
      if (mismatches.length > 0) {
        console.warn(
          `[SEEK import] Data mismatch for ${name}: ${mismatches.join("; ")}`,
        );
      }

      const profileUpdateData: Record<string, unknown> = {
        // Always store SEEK-side email/location for audit
        ...(raw.email?.trim() ? { emailSeek: raw.email.trim() } : {}),
        ...(seekLocation ? { locationSeek: seekLocation } : {}),
        // Update location only if not already set from CV
        ...(seekLocation && !existingProfile?.domicile
          ? { location: seekLocation, domicile: seekLocation }
          : {}),
        // ── FIX 4: Always write salary when scraper provides it ────────────
        ...(salaryExpectation ? { salaryExpectation } : {}),
        // Store SEEK profile ID for future identity matching
        ...(seekProfileId && !existingProfile?.seekProfileId
          ? { seekProfileId }
          : {}),
      };

      if (Object.keys(profileUpdateData).length > 0) {
        await prisma.candidateProfile.upsert({
          where: { userId: existingUser.id },
          update: profileUpdateData,
          create: {
            userId: existingUser.id,
            ...(seekLocation
              ? { location: seekLocation, domicile: seekLocation }
              : {}),
            ...(seekProfileId ? { seekProfileId } : {}),
            ...(raw.email?.trim() ? { emailSeek: raw.email.trim() } : {}),
            ...(salaryExpectation ? { salaryExpectation } : {}),
          },
        });
      }

      let resumeAttached = false;
      if (resumeUrl && !existingProfile?.resumeUrl) {
        await attachResumeToCandidate(
          existingUser.id,
          existingApp.id,
          resumeUrl,
          name,
          resumeMimeType,
        );
        resumeAttached = true;
      }

      return { status: "skipped", resumeAttached, stageLocked };
    }
  }

  // ── New candidate — create user, profile, application ────────────────────
  const randomPassword = await bcrypt.hash(
    Math.random().toString(36).slice(-10),
    10,
  );

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
      ...(seekLocation
        ? { location: seekLocation, domicile: seekLocation }
        : {}),
      ...(resumeUrl ? { resumeUrl } : {}),
      ...(currentEmployment ? { currentTitle: currentEmployment } : {}),
      ...(seekAppliedRole ? { referPosition: seekAppliedRole } : {}),
      ...(raw.mostRecentRole
        ? { currentCompany: raw.mostRecentRole.trim() }
        : {}),
      ...(experienceYears != null ? { experienceYears } : {}),
      ...(typeof raw.experience === "string" && raw.experience.trim()
        ? { summary: raw.experience.trim() }
        : {}),
      // ── FIX 2 + 3 + 4: seekProfileId, emailSeek, locationSeek, salary ────
      ...(seekProfileId ? { seekProfileId } : {}),
      ...(raw.email?.trim() ? { emailSeek: raw.email.trim() } : {}),
      ...(seekLocation ? { locationSeek: seekLocation } : {}),
      ...(salaryExpectation ? { salaryExpectation } : {}),
    },
    create: {
      userId: user.id,
      location: seekLocation ?? undefined,
      domicile: seekLocation ?? undefined,
      ...(resumeUrl ? { resumeUrl } : {}),
      ...(currentEmployment ? { currentTitle: currentEmployment } : {}),
      ...(seekAppliedRole ? { referPosition: seekAppliedRole } : {}),
      ...(raw.mostRecentRole
        ? { currentCompany: raw.mostRecentRole.trim() }
        : {}),
      ...(experienceYears != null ? { experienceYears } : {}),
      ...(typeof raw.experience === "string" && raw.experience.trim()
        ? { summary: raw.experience.trim() }
        : {}),
      ...(seekProfileId ? { seekProfileId } : {}),
      ...(raw.email?.trim() ? { emailSeek: raw.email.trim() } : {}),
      ...(seekLocation ? { locationSeek: seekLocation } : {}),
      ...(salaryExpectation ? { salaryExpectation } : {}),
    },
  });

  // ── FIX 1: New application always starts at "new", then apply SEEK status ─
  // Use the correct appliedAt so newest SEEK candidates appear at top (FIX 5)
  const safeAppliedAt = Number.isNaN(appliedAt.getTime()) ? new Date() : appliedAt;

  const application = await prisma.application.create({
    data: {
      vacancyId,
      candidateId: user.id,
      source: "SEEK",
      // Apply the mapped stage directly on creation — no need to start at "new"
      // then flip, which was causing the two-record duplicate bug
      status: applicationStatusForStage(mappedStage),
      currentStage: mappedStage,
      appliedAt: safeAppliedAt,
      // ── FIX 5: Set createdAt = appliedAt so list sort shows newest SEEK apps first
      createdAt: safeAppliedAt,
      ...(mappedStage === "rejected" ? { rejectedAt: new Date() } : {}),
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

  if (resumeUrl) {
    await prisma.document.create({
      data: {
        applicationId: application.id,
        name: `CV - ${name}`,
        type: "resume",
        fileUrl: resumeUrl,
        mimeType: resumeMimeType,
      },
    });
  }

  return {
    status: "imported",
    vacancyCreated,
    vacancyTitle,
    resumeAttached: Boolean(resumeUrl),
    stageLocked: false,
  };
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
    return NextResponse.json(
      { error: "No candidates provided" },
      { status: 400 },
    );
  }

  const results: ImportResults = {
    imported: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const candidate of candidates) {
    const label = candidate.name?.trim() || candidate.email || "Unknown";
    try {
      const outcome = await importOneCandidate(candidate);
      if (outcome.status === "skipped") {
        results.skipped++;
        const cvNote = outcome.resumeAttached ? ", CV attached" : "";
        const lockNote = outcome.stageLocked
          ? ` [stage locked: kept existing status]`
          : "";
        results.details.push(`SKIP: ${label} (already exists${cvNote}${lockNote})`);
      } else {
        results.imported++;
        const stage = mapSeekStatus(candidate.seekStatus);
        const vacancyNote = outcome.vacancyCreated
          ? `, auto-created job: ${outcome.vacancyTitle}`
          : `, job: ${outcome.vacancyTitle}`;
        const cvNote = outcome.resumeAttached
          ? ", CV uploaded"
          : candidate.resumeBase64
            ? ", CV missing (configure Supabase on Vercel)"
            : "";
        results.details.push(
          `OK: ${label} → stage: ${stage}${vacancyNote}${cvNote}`,
        );
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
  revalidatePath("/dashboard/jobs");

  return NextResponse.json({
    success: true,
    message: `Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`,
    results,
  });
}
