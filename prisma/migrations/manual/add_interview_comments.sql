-- InterviewComment: per-application interview feedback thread with author attribution
CREATE TABLE IF NOT EXISTS "interview_comments" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content"       TEXT NOT NULL,
    "authorId"      TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "interview_comments_applicationId_idx" ON "interview_comments"("applicationId");

ALTER TABLE "interview_comments"
    DROP CONSTRAINT IF EXISTS "interview_comments_applicationId_fkey";
ALTER TABLE "interview_comments"
    ADD CONSTRAINT "interview_comments_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interview_comments"
    DROP CONSTRAINT IF EXISTS "interview_comments_authorId_fkey";
ALTER TABLE "interview_comments"
    ADD CONSTRAINT "interview_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate legacy custom fields (HR Comment, User 1 Comment, User 2 Comment) into interview comments
INSERT INTO "interview_comments" ("id", "applicationId", "content", "authorId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    f."applicationId",
    '[' || f."fieldName" || '] ' || f."fieldValue",
    COALESCE(
        (SELECT u."id" FROM "users" u
         JOIN "user_roles" ur ON ur."userId" = u."id"
         JOIN "roles" r ON r."id" = ur."roleId"
         WHERE r."slug" IN ('admin', 'hr', 'recruiter')
         LIMIT 1),
        (SELECT u."id" FROM "users" u LIMIT 1)
    ),
    f."createdAt",
    f."updatedAt"
FROM "application_custom_fields" f
WHERE f."fieldName" IN ('HR Comment', 'User 1 Comment', 'User 2 Comment')
  AND TRIM(f."fieldValue") <> ''
  AND NOT EXISTS (
      SELECT 1 FROM "interview_comments" ic
      WHERE ic."applicationId" = f."applicationId"
        AND ic."content" = '[' || f."fieldName" || '] ' || f."fieldValue"
  );
