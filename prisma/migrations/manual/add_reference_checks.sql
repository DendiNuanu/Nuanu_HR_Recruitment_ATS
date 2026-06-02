CREATE TABLE IF NOT EXISTS "reference_checks" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "candidate_id"          TEXT NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
  "reference_no"          INTEGER NOT NULL CHECK (reference_no BETWEEN 1 AND 5),
  "agency_name"           TEXT,
  "telephone"             TEXT,
  "city_state"            TEXT,
  "job_title"             TEXT,
  "employment_from"       TEXT,
  "employment_to"         TEXT,
  "reason_for_leaving"    TEXT,
  "eligible_for_rehire"   TEXT,
  "rehire_remarks"        TEXT,
  "person_providing_info" TEXT,
  "person_title"          TEXT,
  "work_performance"      TEXT,
  "strengths"             TEXT,
  "areas_to_improve"      TEXT,
  "additional_notes"      TEXT,
  "overall_rating"        INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  "recommendation"        TEXT,
  "conducted_by"          TEXT REFERENCES "users"("id"),
  "conducted_at"          TIMESTAMP DEFAULT NOW(),
  "updated_at"            TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reference_checks' AND column_name = 'applicationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reference_checks' AND column_name = 'candidate_id'
  ) THEN
    EXECUTE 'ALTER TABLE "reference_checks" RENAME COLUMN "applicationId" TO "candidate_id"';
  END IF;
END $$;

ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "reference_no" INTEGER;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "agency_name" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "telephone" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "city_state" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "job_title" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "employment_from" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "employment_to" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "reason_for_leaving" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "eligible_for_rehire" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "rehire_remarks" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "person_providing_info" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "person_title" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "work_performance" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "areas_to_improve" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "additional_notes" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "overall_rating" INTEGER;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "conducted_by" TEXT;
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "conducted_at" TIMESTAMP DEFAULT NOW();
ALTER TABLE "reference_checks" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW();

UPDATE "reference_checks"
SET
  "reference_no" = COALESCE("reference_no", 1),
  "agency_name" = COALESCE("agency_name", "company"),
  "telephone" = COALESCE("telephone", "phone"),
  "work_performance" = COALESCE("work_performance", "feedback"),
  "additional_notes" = COALESCE("additional_notes", "notes"),
  "conducted_at" = COALESCE("conducted_at", "checkedAt", "createdAt", NOW()),
  "updated_at" = COALESCE("updated_at", "updatedAt", NOW())
WHERE
  "reference_no" IS NULL
  OR "agency_name" IS NULL
  OR "telephone" IS NULL
  OR "work_performance" IS NULL
  OR "additional_notes" IS NULL
  OR "conducted_at" IS NULL
  OR "updated_at" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reference_checks_reference_no_check'
  ) THEN
    EXECUTE 'ALTER TABLE "reference_checks" ADD CONSTRAINT "reference_checks_reference_no_check" CHECK ("reference_no" BETWEEN 1 AND 5)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reference_checks_overall_rating_check'
  ) THEN
    EXECUTE 'ALTER TABLE "reference_checks" ADD CONSTRAINT "reference_checks_overall_rating_check" CHECK ("overall_rating" IS NULL OR "overall_rating" BETWEEN 1 AND 5)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_reference_checks_candidate_id"
  ON "reference_checks"("candidate_id");

CREATE UNIQUE INDEX IF NOT EXISTS "reference_checks_candidate_id_reference_no_key"
  ON "reference_checks"("candidate_id", "reference_no");

CREATE TABLE IF NOT EXISTS "reference_check_shares" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "application_id" TEXT NOT NULL UNIQUE REFERENCES "applications"("id") ON DELETE CASCADE,
  "shared_with_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shared_by_id"   TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "share_token"    TEXT NOT NULL UNIQUE,
  "shared_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_reference_check_shares_shared_with_id"
  ON "reference_check_shares"("shared_with_id");

CREATE INDEX IF NOT EXISTS "idx_reference_check_shares_shared_by_id"
  ON "reference_check_shares"("shared_by_id");
