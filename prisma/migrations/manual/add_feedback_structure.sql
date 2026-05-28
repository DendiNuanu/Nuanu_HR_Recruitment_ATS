ALTER TABLE "interview_comments"
  ADD COLUMN IF NOT EXISTS "reviewer_type" TEXT DEFAULT 'HR',
  ADD COLUMN IF NOT EXISTS "rating" INTEGER CHECK ("rating" BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS "recommendation" TEXT;

UPDATE "interview_comments"
SET "reviewer_type" = COALESCE("reviewer_type", 'HR')
WHERE "reviewer_type" IS NULL;
