ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "hrReviewerId" TEXT,
  ADD COLUMN IF NOT EXISTS "user1ReviewerId" TEXT,
  ADD COLUMN IF NOT EXISTS "user2ReviewerId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_hrReviewerId_fkey'
  ) THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_hrReviewerId_fkey"
      FOREIGN KEY ("hrReviewerId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_user1ReviewerId_fkey'
  ) THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_user1ReviewerId_fkey"
      FOREIGN KEY ("user1ReviewerId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_user2ReviewerId_fkey'
  ) THEN
    ALTER TABLE "applications"
      ADD CONSTRAINT "applications_user2ReviewerId_fkey"
      FOREIGN KEY ("user2ReviewerId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "applications_hrReviewerId_idx" ON "applications"("hrReviewerId");
CREATE INDEX IF NOT EXISTS "applications_user1ReviewerId_idx" ON "applications"("user1ReviewerId");
CREATE INDEX IF NOT EXISTS "applications_user2ReviewerId_idx" ON "applications"("user2ReviewerId");
