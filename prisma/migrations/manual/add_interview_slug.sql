-- Shareable Interview Result link: per-user (candidate) slug for /interview-result/[slug]
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "interviewSlug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_interviewSlug_key"
    ON "users"("interviewSlug")
    WHERE "interviewSlug" IS NOT NULL;
