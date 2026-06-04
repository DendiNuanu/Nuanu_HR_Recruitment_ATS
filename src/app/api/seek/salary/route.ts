/**
 * POST /api/seek/salary
 *
 * Resolves a candidate's expected monthly salary from the SEEK scraper
 * checkpoint (cached-only strategy — the scraper writes salary into
 * scrape-checkpoint.json on every profile enrich).
 *
 * Body (any combination):
 *   { profileUrl?: string, candidateId?: string,
 *     name?: string, email?: string, phone?: string }
 *
 * When `candidateId` is supplied and a salary is found, it is also
 * persisted to CandidateProfile.salaryExpectation (the auto-fill).
 *
 * Response: { salaryExpectation: string|null, name: string|null,
 *             matched: boolean, source: "checkpoint"|"profile"|"none" }
 */
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type CheckpointCandidate = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  profileUrl?: string | null;
  salaryExpectation?: string | null;
  expectedSalaryRaw?: string | null;
  expectedSalary?: number | null;
  expectedSalaryCurrency?: string | null;
};

type CheckpointFile = {
  candidates?: CheckpointCandidate[];
};

type LookupKeys = {
  profileUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
};

const DEFAULT_CHECKPOINT_PATHS = [
  process.env.SEEK_CHECKPOINT_PATH,
  path.join(process.cwd(), "..", "seek-scraper", "scrape-checkpoint.json"),
  "/home/dendy/seek-scraper/scrape-checkpoint.json",
].filter(Boolean) as string[];

function resolveCheckpointPath(): string | null {
  for (const candidate of DEFAULT_CHECKPOINT_PATHS) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore — try next
    }
  }
  return null;
}

let cached: { mtimeMs: number; data: CheckpointCandidate[] } | null = null;

function loadCheckpoint(): CheckpointCandidate[] {
  const file = resolveCheckpointPath();
  if (!file) return [];
  try {
    const stat = fs.statSync(file);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as CheckpointFile;
    const data = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    cached = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch (err) {
    console.warn("[/api/seek/salary] failed to read checkpoint:", err);
    return [];
  }
}

function digitsOf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function matchCheckpointRow(
  keys: LookupKeys,
  candidates: CheckpointCandidate[],
): CheckpointCandidate | null {
  const profileUrl = (keys.profileUrl ?? "").trim();
  const email = normalizeEmail(keys.email);
  const phoneTail = digitsOf(keys.phone).slice(-10);
  const name = normalizeName(keys.name);

  // 1) Strongest match: exact profile URL.
  if (profileUrl) {
    const hit = candidates.find(
      (c) => (c.profileUrl ?? "").trim() === profileUrl,
    );
    if (hit) return hit;
  }

  // 2) Email match (case-insensitive).
  if (email && !email.endsWith("@import.nuanu.local")) {
    const hit = candidates.find((c) => normalizeEmail(c.email) === email);
    if (hit) return hit;
  }

  // 3) Phone match — compare on the last 10 digits to ignore +62 / 0 prefixes.
  if (phoneTail.length >= 8) {
    const hit = candidates.find(
      (c) => digitsOf(c.phone).slice(-10) === phoneTail,
    );
    if (hit) return hit;
  }

  // 4) Name match (weakest — last resort).
  if (name) {
    const hit = candidates.find((c) => normalizeName(c.name) === name);
    if (hit) return hit;
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    profileUrl?: string;
    candidateId?: string;
    name?: string;
    email?: string;
    phone?: string;
    persist?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lookup: LookupKeys = {
    profileUrl: body.profileUrl ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    name: body.name ?? null,
  };

  // When a candidateId is supplied, hydrate lookup keys from the DB so the
  // caller only has to send the id.
  if (body.candidateId) {
    const user = await prisma.user.findUnique({
      where: { id: body.candidateId },
      select: { name: true, email: true, phone: true },
    });
    if (user) {
      lookup.name = lookup.name ?? user.name;
      lookup.email = lookup.email ?? user.email;
      lookup.phone = lookup.phone ?? user.phone;
    }
  }

  const rows = loadCheckpoint();
  const row = matchCheckpointRow(lookup, rows);

  const salaryExpectation = row?.salaryExpectation?.trim()
    ? row.salaryExpectation.trim()
    : row?.expectedSalaryRaw?.trim() || null;
  const matched = Boolean(row);

  // Auto-persist to the candidate's profile when we have a hit.
  const shouldPersist = body.persist !== false;
  if (matched && shouldPersist && body.candidateId && salaryExpectation) {
    try {
      await prisma.candidateProfile.upsert({
        where: { userId: body.candidateId },
        update: { salaryExpectation },
        create: { userId: body.candidateId, salaryExpectation },
      });
      revalidatePath("/dashboard/candidates");
    } catch (err) {
      console.warn("[/api/seek/salary] failed to persist salary:", err);
    }
  }

  return NextResponse.json({
    salaryExpectation,
    name: row?.name ?? lookup.name ?? null,
    matched,
    source: matched
      ? row?.salaryExpectation
        ? "checkpoint"
        : "profile"
      : "none",
  });
}
