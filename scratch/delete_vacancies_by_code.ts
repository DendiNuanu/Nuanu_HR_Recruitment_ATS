/**
 * Permanently delete vacancies (and cascaded applications) by job code.
 * Usage:
 *   npx tsx scratch/delete_vacancies_by_code.ts          # dry-run (default)
 *   npx tsx scratch/delete_vacancies_by_code.ts --execute # perform deletion
 */
import { PrismaClient } from '@prisma/client';

const TARGET_CODES = [
  'JOB-5297',
  'REQ-6372',
  'JOB-6411',
  'MKT-002',
  'ENG-005',
  'ENG-004',
  'OPS-001',
  'PROD-001',
  'FIN-001',
  'MKT-001',
  'ENG-003',
  'ENG-002',
  'ENG-001',
];

const prisma = new PrismaClient();
const execute = process.argv.includes('--execute');

async function deleteApplicationChain(applicationId: string) {
  const offer = await prisma.offer.findUnique({ where: { applicationId } });
  if (offer) {
    await prisma.contract.deleteMany({ where: { offerId: offer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
  }
  await prisma.application.delete({ where: { id: applicationId } });
}

async function deleteVacancyWithRelations(vacancyId: string) {
  const applications = await prisma.application.findMany({
    where: { vacancyId },
    select: { id: true },
  });
  for (const app of applications) {
    await deleteApplicationChain(app.id);
  }
  await prisma.legacyApproval.deleteMany({ where: { vacancyId } });
  await prisma.jobRequisition.deleteMany({ where: { vacancyId } });
  await prisma.jobPosting.deleteMany({ where: { vacancyId } });
  await prisma.vacancy.delete({ where: { id: vacancyId } });
}

async function main() {
  console.log(execute ? '=== EXECUTE MODE ===' : '=== DRY RUN (pass --execute to delete) ===');
  console.log('Target codes:', TARGET_CODES.join(', '));
  console.log('');

  const vacancies = await prisma.vacancy.findMany({
    where: { code: { in: TARGET_CODES } },
    include: {
      department: { select: { name: true } },
      _count: { select: { applications: true } },
    },
  });

  const found = new Set(vacancies.map((v) => v.code));
  const notFound = TARGET_CODES.filter((c) => !found.has(c));

  if (vacancies.length === 0) {
    console.log('No matching vacancies found.');
    if (notFound.length) console.log('Not found:', notFound.join(', '));
    return;
  }

  console.log(`Found ${vacancies.length} vacancy/vacancies:\n`);
  for (const v of vacancies) {
    console.log(
      `- ${v.title} [${v.code}] id=${v.id} status=${v.status} dept=${v.department.name} applications=${v._count.applications}`,
    );
  }
  console.log('');

  if (notFound.length) {
    console.log('Not found:', notFound.join(', '));
    console.log('');
  }

  if (!execute) {
    console.log('Dry run complete. Re-run with --execute to delete.');
    return;
  }

  const deleted: { id: string; code: string; title: string; applications: number }[] = [];

  await prisma.$transaction(
    async () => {
      for (const v of vacancies) {
        await deleteVacancyWithRelations(v.id);
        deleted.push({
          id: v.id,
          code: v.code,
          title: v.title,
          applications: v._count.applications,
        });
      }
    },
    { maxWait: 30_000, timeout: 300_000 },
  );

  console.log('Deleted:');
  for (const d of deleted) {
    console.log(`- ${d.title} [${d.code}] id=${d.id} (applications removed: ${d.applications})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
