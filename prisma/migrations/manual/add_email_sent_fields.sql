-- Add emailSentAt and emailSentSubject to applications table (safe, idempotent)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "emailSentSubject" VARCHAR;

-- Add domicile and referPosition to candidate_profiles table (safe, idempotent)
ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS "domicile" VARCHAR,
  ADD COLUMN IF NOT EXISTS "referPosition" VARCHAR;
