/**
 * Migration script: Download all resume files from Supabase Storage to local
 * droplet filesystem and update resumeUrl in candidate_profiles.
 *
 * Usage: npx tsx scripts/migrate-resumes.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "resumes");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hr-ats.nuanu.site";

async function main() {
  console.log("[migrate-resumes] Starting Supabase Storage → local migration...\n");

  // Ensure uploads directory exists
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // Get all profiles with Supabase resume URLs
  const profiles = await prisma.candidateProfile.findMany({
    where: {
      resumeUrl: { contains: "supabase.co" },
    },
    select: { id: true, resumeUrl: true },
  });

  console.log(`[migrate-resumes] Found ${profiles.length} profiles with Supabase resume URLs\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const supabaseUrl = profile.resumeUrl!;

    // Extract filename from URL
    // e.g. https://...supabase.co/.../resumes/seek-1779384886561-Sajiwo_Haryanto_..._Resume.pdf
    const urlParts = supabaseUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      failed++;
      errors.push(`[${profile.id}] Cannot extract filename from: ${supabaseUrl}`);
      continue;
    }

    const localPath = path.join(UPLOADS_DIR, filename);
    const newUrl = `${APP_URL}/uploads/resumes/${filename}`;

    // Check if file already exists (skip if so)
    try {
      await fs.access(localPath);
      // File exists, just update the URL
      await prisma.candidateProfile.update({
        where: { id: profile.id },
        data: { resumeUrl: newUrl },
      });
      skipped++;
      if ((i + 1) % 50 === 0 || i === profiles.length - 1) {
        console.log(`  [${i + 1}/${profiles.length}] skipped: ${skipped}, downloaded: ${downloaded}, failed: ${failed}`);
      }
      continue;
    } catch {
      // File doesn't exist, download it
    }

    // Download from Supabase using curl
    try {
      console.log(`  [${i + 1}/${profiles.length}] Downloading: ${filename}`);
      execSync(
        `curl -s -o "${localPath}" "${supabaseUrl}" --max-time 30`,
        { stdio: "pipe" },
      );
      downloaded++;
    } catch (err: any) {
      failed++;
      const msg = `[${profile.id}] Failed to download ${filename}: ${err.message}`;
      errors.push(msg);
      console.error(`  ERROR: ${msg}`);
      continue;
    }

    // Update database URL
    try {
      await prisma.candidateProfile.update({
        where: { id: profile.id },
        data: { resumeUrl: newUrl },
      });
    } catch (err: any) {
      errors.push(`[${profile.id}] Failed to update DB: ${err.message}`);
    }

    if ((i + 1) % 50 === 0 || i === profiles.length - 1) {
      console.log(`  [${i + 1}/${profiles.length}] skipped: ${skipped}, downloaded: ${downloaded}, failed: ${failed}`);
    }
  }

  console.log(`\n[migrate-resumes] COMPLETE`);
  console.log(`  Total profiles: ${profiles.length}`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped (already local): ${skipped}`);
  console.log(`  Failed: ${failed}`);

  if (errors.length > 0) {
    console.log(`\n  Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`    ${e}`));
  }

  // Verify: count remaining Supabase URLs
  const remaining = await prisma.candidateProfile.count({
    where: { resumeUrl: { contains: "supabase.co" } },
  });
  console.log(`\n  Remaining Supabase URLs in DB: ${remaining}`);
}

main()
  .catch((e) => {
    console.error("[migrate-resumes] FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());