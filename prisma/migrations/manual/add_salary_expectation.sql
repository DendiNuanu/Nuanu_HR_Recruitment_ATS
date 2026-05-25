-- Salary expectation (free-text, e.g. Rp 10.000.000 / month)
ALTER TABLE "candidate_profiles"
  ADD COLUMN IF NOT EXISTS "salaryExpectation" TEXT;
