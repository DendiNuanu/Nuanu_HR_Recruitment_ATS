/**
 * Backfill Employee records for all candidates currently in hired/onboarding stage
 * who don't have an Employee record yet.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateCode(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

async function main() {
  // Find all applications in hired or onboarding stage
  const apps = await prisma.application.findMany({
    where: {
      currentStage: { in: ["hired", "onboarding"] },
      deletedAt: null,
    },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      vacancy: { select: { title: true, departmentId: true } },
    },
  });

  console.log(`Found ${apps.length} hired/onboarding candidates`);

  let created = 0;
  let skipped = 0;

  for (const app of apps) {
    const existing = await prisma.employee.findUnique({
      where: { userId: app.candidateId },
    });

    if (existing) {
      console.log(`  SKIP: ${app.candidate.name} — already has employee record (${existing.status})`);
      skipped++;
      continue;
    }

    const startDate = new Date();
    const status = app.currentStage === "hired" ? "active" : "onboarding";

    await prisma.employee.create({
      data: {
        userId: app.candidateId,
        employeeCode: generateCode("EMP"),
        position: app.vacancy.title,
        departmentId: app.vacancy.departmentId,
        startDate,
        status,
        check90DueAt: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        check180DueAt: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`  CREATED: ${app.candidate.name} — ${app.vacancy.title} (${status})`);
    created++;
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
