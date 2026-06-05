-- Add SEEK-specific identity and audit fields to candidate_profiles
-- seekProfileId: stable SEEK UUID from profile URL (?selected=...)
-- emailSeek:     email address as shown on SEEK profile (may differ from CV)
-- locationSeek:  location as scraped from SEEK profile (may differ from CV)

ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS "seekProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "emailSeek"     TEXT,
  ADD COLUMN IF NOT EXISTS "locationSeek"  TEXT;

-- Index for fast dedup lookup by SEEK profile ID
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_seek_profile_id
  ON candidate_profiles ("seekProfileId")
  WHERE "seekProfileId" IS NOT NULL;
