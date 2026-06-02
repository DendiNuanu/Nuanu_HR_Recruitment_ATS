/**
 * Remove all activity logs (stale demo entries on dashboard Recent Activity).
 * Usage: npx tsx scratch/cleanup_activity_logs.ts [--execute]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

async function main() {
  const count = await prisma.activityLog.count();
  console.log(execute ? "=== EXECUTE ===" : "=== DRY RUN ===");
  console.log(`Activity logs in database: ${count}`);

  if (!execute) {
    console.log("Re-run with --execute to delete all activity logs.");
    return;
  }

  const result = await prisma.activityLog.deleteMany();
  console.log(`Deleted ${result.count} activity log(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
