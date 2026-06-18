/**
 * Backfill SEEK profile detail fields from scrape-checkpoint.json into
 * the candidate_profiles table.
 *
 * Phase 2 (TURBO_ENRICH) extracts careerHistory, education,
 * licencesAndCertifications, applicationQuestions, and skills from each
 * candidate's profile tab, but the scraper's sendToNuanuATS() skips
 * already-imported candidates.  This script reads the checkpoint and
 * writes those 5 fields directly into the database.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-seek-fields.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const CHECKPOINT_PATH =
  process.env.SEEK_CHECKPOINT_PATH ||
  "/home/dendy/seek-scraper/scrape-checkpoint.json";

const prisma = new PrismaClient();

interface CheckpointCandidate {
  name?: string;
  email?: string;
  phone?: string;
  seekProfileId?: string;
  careerHistory?: unknown;
  education?: unknown;
  licencesAndCertifications?: unknown;
  applicationQuestions?: unknown;
  skills?: unknown;
}

interface Checkpoint {
  candidates?: CheckpointCandidate[];
  lastPage?: number;
}

async function main() {
  if (!fs.existsSync(CHECKPOINT_PATH)) {
    console.error(`❌ Checkpoint not found: ${CHECKPOINT_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CHECKPOINT_PATH, "utf-8");
  const cp: Checkpoint = JSON.parse(raw);
  const candidates = cp.candidates ?? [];

  if (candidates.length === 0) {
    console.log("No candidates in checkpoint.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Checkpoint has ${candidates.length} candidates\n`);

  // Filter to candidates that actually have at least one of the 5 fields
  const enriched = candidates.filter(
    (c) =>
      (Array.isArray(c.careerHistory) && c.careerHistory.length > 0) ||
      (Array.isArray(c.education) && c.education.length > 0) ||
      (Array.isArray(c.licencesAndCertifications) &&
        c.licencesAndCertifications.length > 0) ||
      (Array.isArray(c.applicationQuestions) &&
        c.applicationQuestions.length > 0) ||
      (Array.isArray(c.skills) && c.skills.length > 0),
  );

  console.log(
    `🔍 ${enriched.length} candidates have enriched profile data\n`,
  );

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of enriched) {
    const label = c.name || c.email || c.phone || "unknown";

    // Match by seekProfileId first (most stable), then by email
    let profile = null;

    if (c.seekProfileId) {
      profile = await prisma.candidateProfile.findFirst({
        where: { seekProfileId: c.seekProfileId },
        select: { userId: true, seekCareerHistory: true, seekEducation: true },
      });
    }

    if (!profile && c.email) {
      const user = await prisma.user.findUnique({
        where: { email: c.email.trim().toLowerCase() },
        select: { id: true },
      });
      if (user) {
        profile = await prisma.candidateProfile.findUnique({
          where: { userId: user.id },
          select: {
            userId: true,
            seekCareerHistory: true,
            seekEducation: true,
          },
        });
      }
    }

    if (!profile) {
      console.log(`  ⏭️  SKIP ${label}: no matching candidate_profile in DB`);
      skipped++;
      continue;
    }

    // Check if already populated (don't overwrite)
    const alreadyHasData =
      (profile.seekCareerHistory as unknown[])?.length > 0 ||
      (profile.seekEducation as unknown[])?.length > 0;

    if (alreadyHasData) {
      console.log(`  ⏭️  SKIP ${label}: already has data`);
      skipped++;
      continue;
    }

    try {
      await prisma.candidateProfile.update({
        where: { userId: profile.userId },
        data: {
          seekCareerHistory: (c.careerHistory as any) ?? undefined,
          seekEducation: (c.education as any) ?? undefined,
          seekLicencesAndCertifications:
            (c.licencesAndCertifications as any) ?? undefined,
          seekApplicationQuestions:
            (c.applicationQuestions as any) ?? undefined,
          seekSkills: (c.skills as any) ?? undefined,
        },
      });

      const careerCount = Array.isArray(c.careerHistory)
        ? c.careerHistory.length
        : 0;
      const eduCount = Array.isArray(c.education) ? c.education.length : 0;
      const licCount = Array.isArray(c.licencesAndCertifications)
        ? c.licencesAndCertifications.length
        : 0;
      const qCount = Array.isArray(c.applicationQuestions)
        ? c.applicationQuestions.length
        : 0;
      const skillCount = Array.isArray(c.skills) ? c.skills.length : 0;

      console.log(
        `  ✅ UPDATED ${label}: career=${careerCount} edu=${eduCount} lic=${licCount} q=${qCount} skills=${skillCount}`,
      );
      updated++;
    } catch (err: any) {
      console.error(`  ❌ ERROR ${label}: ${err.message}`);
      errors++;
    }
  }

  console.log(
    `\n📊 Backfill complete: ${updated} updated, ${skipped} skipped, ${errors} errors`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});