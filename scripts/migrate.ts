/**
 * Safe migration script — runs ALTER TABLE IF NOT EXISTS before build.
 * Called from package.json build script.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[migrate] Running safe column additions...");

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE applications
        ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "emailSentSubject" VARCHAR,
        ADD COLUMN IF NOT EXISTS "appliedFor" VARCHAR,
        ALTER COLUMN "currentStage" SET DEFAULT 'new'
    `);
    console.log("[migrate] ✅ applications columns OK");
  } catch (e) {
    console.warn("[migrate] applications columns (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE candidate_profiles
        ADD COLUMN IF NOT EXISTS "domicile" VARCHAR,
        ADD COLUMN IF NOT EXISTS "referPosition" VARCHAR,
        ADD COLUMN IF NOT EXISTS "salaryExpectation" TEXT,
        ADD COLUMN IF NOT EXISTS "seekProfileId" TEXT,
        ADD COLUMN IF NOT EXISTS "emailSeek" TEXT,
        ADD COLUMN IF NOT EXISTS "locationSeek" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_candidate_profiles_seek_profile_id
        ON candidate_profiles ("seekProfileId")
        WHERE "seekProfileId" IS NOT NULL
    `);
    console.log("[migrate] ✅ candidate_profiles columns OK");
  } catch (e) {
    console.warn("[migrate] candidate_profiles columns (non-fatal):", e);
  }

  // Also create employees and system_settings tables if they don't exist
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL UNIQUE,
        "employeeCode" TEXT NOT NULL UNIQUE,
        position TEXT NOT NULL,
        "departmentId" TEXT,
        "startDate" TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        "retained90" BOOLEAN,
        "retained180" BOOLEAN,
        "check90DueAt" TIMESTAMP,
        "check180DueAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ employees table OK");
  } catch (e) {
    console.warn("[migrate] employees table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ system_settings table OK");
  } catch (e) {
    console.warn("[migrate] system_settings table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ password_reset_tokens table OK");
  } catch (e) {
    console.warn("[migrate] password_reset_tokens table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS assessment_links (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "assessmentId" TEXT NOT NULL UNIQUE,
        token TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ assessment_links table OK");
  } catch (e) {
    console.warn("[migrate] assessment_links table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reference_checks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        candidate_id TEXT NOT NULL,
        reference_no INTEGER NOT NULL DEFAULT 1,
        agency_name TEXT,
        telephone TEXT,
        city_state TEXT,
        job_title TEXT,
        employment_from TEXT,
        employment_to TEXT,
        reason_for_leaving TEXT,
        eligible_for_rehire TEXT,
        rehire_remarks TEXT,
        person_providing_info TEXT,
        person_title TEXT,
        work_performance TEXT,
        strengths TEXT,
        areas_to_improve TEXT,
        additional_notes TEXT,
        overall_rating INTEGER,
        recommendation TEXT,
        conducted_by TEXT,
        conducted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE reference_checks
        ADD COLUMN IF NOT EXISTS candidate_id TEXT,
        ADD COLUMN IF NOT EXISTS reference_no INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS agency_name TEXT,
        ADD COLUMN IF NOT EXISTS telephone TEXT,
        ADD COLUMN IF NOT EXISTS city_state TEXT,
        ADD COLUMN IF NOT EXISTS job_title TEXT,
        ADD COLUMN IF NOT EXISTS employment_from TEXT,
        ADD COLUMN IF NOT EXISTS employment_to TEXT,
        ADD COLUMN IF NOT EXISTS reason_for_leaving TEXT,
        ADD COLUMN IF NOT EXISTS eligible_for_rehire TEXT,
        ADD COLUMN IF NOT EXISTS rehire_remarks TEXT,
        ADD COLUMN IF NOT EXISTS person_providing_info TEXT,
        ADD COLUMN IF NOT EXISTS person_title TEXT,
        ADD COLUMN IF NOT EXISTS work_performance TEXT,
        ADD COLUMN IF NOT EXISTS strengths TEXT,
        ADD COLUMN IF NOT EXISTS areas_to_improve TEXT,
        ADD COLUMN IF NOT EXISTS additional_notes TEXT,
        ADD COLUMN IF NOT EXISTS overall_rating INTEGER,
        ADD COLUMN IF NOT EXISTS recommendation TEXT,
        ADD COLUMN IF NOT EXISTS conducted_by TEXT,
        ADD COLUMN IF NOT EXISTS conducted_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reference_checks' AND column_name = 'applicationId'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'reference_checks' AND column_name = 'candidate_id'
        ) THEN
          EXECUTE 'ALTER TABLE reference_checks RENAME COLUMN "applicationId" TO candidate_id';
        END IF;
      END $$;
    `);
    await prisma
      .$executeRawUnsafe(
        `
      UPDATE reference_checks
      SET candidate_id = COALESCE(candidate_id, "applicationId")
      WHERE candidate_id IS NULL
    `,
      )
      .catch(() => undefined);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reference_checks_candidate_id
      ON reference_checks(candidate_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS reference_checks_candidate_id_reference_no_key
      ON reference_checks(candidate_id, reference_no)
    `);
    console.log("[migrate] ✅ reference_checks table OK");
  } catch (e) {
    console.warn("[migrate] reference_checks table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reference_check_shares (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        application_id TEXT NOT NULL UNIQUE,
        shared_with_id TEXT NOT NULL,
        shared_by_id TEXT NOT NULL,
        share_token TEXT NOT NULL UNIQUE,
        shared_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reference_check_shares_shared_with_id
      ON reference_check_shares(shared_with_id)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reference_check_shares_shared_by_id
      ON reference_check_shares(shared_by_id)
    `);
    console.log("[migrate] ✅ reference_check_shares table OK");
  } catch (e) {
    console.warn("[migrate] reference_check_shares table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS offer_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        variables TEXT[] NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ offer_templates table OK");
  } catch (e) {
    console.warn("[migrate] offer_templates table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS interview_comments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "applicationId" TEXT NOT NULL,
        content TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS interview_comments_applicationId_idx
        ON interview_comments("applicationId")
    `);
    console.log("[migrate] ✅ interview_comments table OK");
  } catch (e) {
    console.warn("[migrate] interview_comments table (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS recruitment_channel_costs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        channel TEXT NOT NULL,
        cost DOUBLE PRECISION NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IDR',
        year INTEGER NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(channel, year)
      )
    `);
    console.log("[migrate] ✅ recruitment_channel_costs table OK");
  } catch (e) {
    console.warn("[migrate] recruitment_channel_costs table (non-fatal):", e);
  }

  // Shareable interview-result link (per candidate / user)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "interviewSlug" TEXT
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_interviewSlug_key"
        ON users("interviewSlug")
        WHERE "interviewSlug" IS NOT NULL
    `);
    console.log("[migrate] ✅ users.interviewSlug column OK");
  } catch (e) {
    console.warn("[migrate] users.interviewSlug column (non-fatal):", e);
  }

  console.log("[migrate] Done.");
}

main()
  .catch((e) => {
    console.error("[migrate] Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
