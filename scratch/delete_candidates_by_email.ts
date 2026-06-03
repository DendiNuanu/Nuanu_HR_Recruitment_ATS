/**
 * Permanently delete specific candidate users (and related records) by email.
 * Usage:
 *   npx tsx scratch/delete_candidates_by_email.ts          # dry-run (default)
 *   npx tsx scratch/delete_candidates_by_email.ts --execute # perform deletion
 */
import { PrismaClient } from "@prisma/client";
import { deleteCandidatesByEmails } from "../src/lib/delete-candidate";

// Example: ["duplicate@example.com"]
const TARGET_EMAILS: string[] = [];

const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Set DATABASE_URL or DIRECT_URL in .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});
const execute = process.argv.includes("--execute");

async function main() {
  console.log(
    execute ? "=== EXECUTE MODE ===" : "=== DRY RUN (pass --execute to delete) ===",
  );
  console.log("Target emails:", TARGET_EMAILS.join(", "));
  console.log("");

  const result = await deleteCandidatesByEmails(prisma, TARGET_EMAILS, {
    execute,
  });

  const foundEmails = new Set(result.users.map((u) => u.email.toLowerCase()));
  const notFound = TARGET_EMAILS.filter(
    (e) => !foundEmails.has(e.toLowerCase()),
  );

  if (result.users.length === 0) {
    console.log("No matching users found.");
    if (notFound.length) console.log("Not found:", notFound.join(", "));
    return;
  }

  console.log(`Found ${result.users.length} user(s):\n`);
  for (const u of result.users) {
    const roles = u.userRoles.map((ur) => ur.role.slug).join(", ") || "(none)";
    console.log(`- ${u.name} <${u.email}> id=${u.id} roles=[${roles}]`);
    for (const app of u.applications) {
      console.log(
        `    application id=${app.id} status=${app.status} stage=${app.currentStage} vacancy="${app.vacancy.title}"`,
      );
    }
    if (u.employeeRecord) {
      console.log(
        `    employee id=${u.employeeRecord.id} code=${u.employeeRecord.employeeCode} position=${u.employeeRecord.position}`,
      );
    }
    console.log("");
  }

  if (notFound.length) {
    console.log("Not found:", notFound.join(", "));
    console.log("");
  }

  if (result.dryRun) {
    console.log("Dry run complete. Re-run with --execute to delete.");
    return;
  }

  console.log("Deleted:");
  for (const d of result.deleted) {
    console.log(`- ${d.name} <${d.email}> id=${d.id}`);
  }
  if (notFound.length) {
    console.log("Still not found:", notFound.join(", "));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
