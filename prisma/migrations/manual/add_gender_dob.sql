ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
