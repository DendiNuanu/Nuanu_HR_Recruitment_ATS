/**
 * Permanently delete specific candidate users (and related records) by email.
 * Usage:
 *   npx tsx scratch/delete_candidates_by_email.ts          # dry-run (default)
 *   npx tsx scratch/delete_candidates_by_email.ts --execute # perform deletion
 */
import { PrismaClient } from '@prisma/client';

// Add emails to delete, then: npx tsx scratch/delete_candidates_by_email.ts --execute
const TARGET_EMAILS: string[] = [];

const dbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Set DATABASE_URL or DIRECT_URL in .env');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});
const execute = process.argv.includes('--execute');

async function deleteEmployeeChain(userId: string) {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) return { employee: 0 };

  const employeeId = employee.id;

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

  return { employee: 1 };
}

async function deleteApplicationChain(applicationId: string) {
  const offer = await prisma.offer.findUnique({ where: { applicationId } });
  if (offer) {
    await prisma.contract.deleteMany({ where: { offerId: offer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
  }

  await prisma.activityLog.deleteMany({ where: { resourceId: applicationId } });
  await prisma.application.delete({ where: { id: applicationId } });
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
  await deleteEmployeeChain(userId);
  await prisma.candidateProfile.deleteMany({ where: { userId } });
  await prisma.activityLog.deleteMany({
    where: { OR: [{ userId }, { resourceId: userId }] },
  });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  console.log(execute ? '=== EXECUTE MODE ===' : '=== DRY RUN (pass --execute to delete) ===');
  console.log('Target emails:', TARGET_EMAILS.join(', '));
  console.log('');

  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS, mode: 'insensitive' } },
    include: {
      applications: {
        include: {
          vacancy: { select: { title: true } },
        },
      },
      employeeRecord: { select: { id: true, employeeCode: true, position: true } },
      userRoles: { include: { role: { select: { slug: true } } } },
    },
  });

  const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const notFound = TARGET_EMAILS.filter((e) => !foundEmails.has(e.toLowerCase()));

  if (users.length === 0) {
    console.log('No matching users found.');
    if (notFound.length) console.log('Not found:', notFound.join(', '));
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);
  for (const u of users) {
    const roles = u.userRoles.map((ur) => ur.role.slug).join(', ') || '(none)';
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
    console.log('');
  }

  if (notFound.length) {
    console.log('Not found:', notFound.join(', '));
    console.log('');
  }

  const adminLike = users.filter((u) =>
    u.userRoles.some((ur) => ['admin', 'super_admin'].includes(ur.role.slug)),
  );
  if (adminLike.length) {
    console.error('ABORT: matched user(s) have admin roles:', adminLike.map((u) => u.email).join(', '));
    process.exit(1);
  }

  if (!execute) {
    console.log('Dry run complete. Re-run with --execute to delete.');
    return;
  }

  const deleted: { id: string; email: string; name: string }[] = [];

  await prisma.$transaction(
    async () => {
      for (const u of users) {
        await deleteCandidateUser(u.id);
        deleted.push({ id: u.id, email: u.email, name: u.name });
      }
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  console.log('Deleted:');
  for (const d of deleted) {
    console.log(`- ${d.name} <${d.email}> id=${d.id}`);
  }
  if (notFound.length) {
    console.log('Still not found:', notFound.join(', '));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
