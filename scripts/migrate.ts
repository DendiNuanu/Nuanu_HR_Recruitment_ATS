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
        ADD COLUMN IF NOT EXISTS "emailSentSubject" VARCHAR
    `);
    console.log("[migrate] ✅ applications columns OK");
  } catch (e) {
    console.warn("[migrate] applications columns (non-fatal):", e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE candidate_profiles
        ADD COLUMN IF NOT EXISTS "domicile" VARCHAR,
        ADD COLUMN IF NOT EXISTS "referPosition" VARCHAR
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
        "applicationId" TEXT NOT NULL,
        "refereeName" TEXT NOT NULL,
        relationship TEXT NOT NULL,
        company TEXT,
        phone TEXT,
        email TEXT,
        feedback TEXT,
        rating INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        "checkedById" TEXT,
        "checkedAt" TIMESTAMP,
        notes TEXT,
        recommendation TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migrate] ✅ reference_checks table OK");
  } catch (e) {
    console.warn("[migrate] reference_checks table (non-fatal):", e);
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

  console.log("[migrate] Done.");
}

main()
  .catch((e) => {
    console.error("[migrate] Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
