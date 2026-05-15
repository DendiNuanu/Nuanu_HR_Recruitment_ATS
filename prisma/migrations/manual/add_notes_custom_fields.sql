-- CandidateNote: per-application HR notes with author attribution
CREATE TABLE IF NOT EXISTS "candidate_notes" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content"       TEXT NOT NULL,
    "authorId"      TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "candidate_notes_applicationId_idx" ON "candidate_notes"("applicationId");

ALTER TABLE "candidate_notes"
    DROP CONSTRAINT IF EXISTS "candidate_notes_applicationId_fkey";
ALTER TABLE "candidate_notes"
    ADD CONSTRAINT "candidate_notes_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_notes"
    DROP CONSTRAINT IF EXISTS "candidate_notes_authorId_fkey";
ALTER TABLE "candidate_notes"
    ADD CONSTRAINT "candidate_notes_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ApplicationCustomField: flexible key-value fields per application
CREATE TABLE IF NOT EXISTS "application_custom_fields" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fieldName"     TEXT NOT NULL,
    "fieldValue"    TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "application_custom_fields_applicationId_idx" ON "application_custom_fields"("applicationId");

ALTER TABLE "application_custom_fields"
    DROP CONSTRAINT IF EXISTS "application_custom_fields_applicationId_fkey";
ALTER TABLE "application_custom_fields"
    ADD CONSTRAINT "application_custom_fields_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
