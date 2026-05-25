/**
 * Remove leftover demo/seed candidates, offers, employees, onboarding, notifications.
 * Keeps staff users (admin, hr, recruiter, etc.).
 *
 * Usage:
 *   npx tsx scratch/purge_demo_data.ts          # dry-run
 *   npx tsx scratch/purge_demo_data.ts --execute
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

const STAFF_ROLE_SLUGS = [
  "super-admin",
  "super_admin",
  "admin",
  "hr_admin",
  "hr",
  "recruiter",
  "hiring_manager",
  "interviewer",
  "finance",
  "manager",
];

function isProtectedStaff(email: string) {
  return email.endsWith("@nuanu.com");
}

async function deleteApplicationChain(applicationId: string) {
  const offer = await prisma.offer.findUnique({ where: { applicationId } });
  if (offer) {
    await prisma.contract.deleteMany({ where: { offerId: offer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
  }
  await prisma.application.delete({ where: { id: applicationId } });
}

async function deleteEmployeeChain(employeeId: string) {
  const probation = await prisma.probationRecord.findUnique({
    where: { employeeId },
  });
  if (probation) {
    await prisma.probationEvaluation.deleteMany({
      where: { probationRecordId: probation.id },
    });
    await prisma.probationExtension.deleteMany({
      where: { probationRecordId: probation.id },
    });
    await prisma.probationRecord.delete({ where: { id: probation.id } });
  }
  await prisma.memoHire.deleteMany({ where: { employeeId } });
  await prisma.employeeContract.deleteMany({ where: { employeeId } });
  await prisma.employeeDocument.deleteMany({ where: { employeeId } });
  await prisma.employeeAsset.deleteMany({ where: { employeeId } });
  await prisma.onboarding.deleteMany({ where: { employeeId } });
  await prisma.employee.delete({ where: { id: employeeId } });
}

async function deleteCandidateUser(userId: string) {
  const applications = await prisma.application.findMany({
    where: { candidateId: userId },
    select: { id: true },
  });
  for (const app of applications) {
    await deleteApplicationChain(app.id);
  }
  await prisma.onboardingTask.deleteMany({ where: { employeeId: userId } });
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (employee) await deleteEmployeeChain(employee.id);
  await prisma.candidateProfile.deleteMany({ where: { userId } });
  await prisma.activityLog.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  console.log(execute ? "=== EXECUTE PURGE ===" : "=== DRY RUN ===");

  const staffUsers = await prisma.user.findMany({
    where: { userRoles: { some: { role: { slug: { in: STAFF_ROLE_SLUGS } } } } },
    select: { id: true, email: true },
  });
  const staffIds = new Set(staffUsers.map((u) => u.id));

  const candidateUsers = await prisma.user.findMany({
    where: { id: { notIn: [...staffIds] } },
    select: { id: true, email: true, name: true },
  }).then((users) => users.filter((u) => !isProtectedStaff(u.email)));

  const [
    appCount,
    offerCount,
    employeeCount,
    onboardingTaskCount,
    notificationCount,
    scoreCount,
    profileCount,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.offer.count(),
    prisma.employee.count(),
    prisma.onboardingTask.count(),
    prisma.notification.count(),
    prisma.candidateScore.count(),
    prisma.candidateProfile.count({
      where: { userId: { notIn: [...staffIds] } },
    }),
  ]);

  console.log("\nCurrent counts:");
  console.log({
    applications: appCount,
    offers: offerCount,
    employees: employeeCount,
    onboardingTasks: onboardingTaskCount,
    notifications: notificationCount,
    candidateScores: scoreCount,
    nonStaffProfiles: profileCount,
    nonStaffUsers: candidateUsers.length,
  });

  console.log("\nNon-staff users to remove:");
  for (const u of candidateUsers.slice(0, 30)) {
    console.log(`  - ${u.name} <${u.email}>`);
  }
  if (candidateUsers.length > 30) {
    console.log(`  ... and ${candidateUsers.length - 30} more`);
  }

  if (!execute) {
    console.log("\nDry run complete. Re-run with --execute to purge.");
    return;
  }

  // Orphan offers/applications for deleted users
  const allApps = await prisma.application.findMany({ select: { id: true } });
  for (const app of allApps) {
    await deleteApplicationChain(app.id);
  }

  const allEmployees = await prisma.employee.findMany({ select: { id: true } });
  for (const e of allEmployees) {
    await deleteEmployeeChain(e.id);
  }

  await prisma.onboardingTask.deleteMany();
  await prisma.notification.deleteMany();
  const deletedLogs = await prisma.activityLog.deleteMany();
  console.log(`Deleted ${deletedLogs.count} activity log(s).`);

  for (const u of candidateUsers) {
    try {
      await deleteCandidateUser(u.id);
    } catch {
      // User may already be partially deleted
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  }

  // Scrub github jobs source on any remaining applications
  await prisma.application.updateMany({
    where: { source: { contains: "github", mode: "insensitive" } },
    data: { source: "other" },
  });
  await prisma.application.updateMany({
    where: { source: { equals: "JobStreet", mode: "insensitive" } },
    data: { source: "seek" },
  });
  await prisma.application.updateMany({
    where: { source: { equals: "jobstreet", mode: "insensitive" } },
    data: { source: "seek" },
  });

  const after = {
    applications: await prisma.application.count(),
    offers: await prisma.offer.count(),
    employees: await prisma.employee.count(),
    onboardingTasks: await prisma.onboardingTask.count(),
    notifications: await prisma.notification.count(),
    users: await prisma.user.count(),
  };

  console.log("\nAfter purge:", after);
  console.log("\nDone. Redeploy or wait ~30s for dashboard cache to refresh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
