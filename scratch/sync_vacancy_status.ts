import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all approved requisitions
  const approvedReqs = await prisma.jobRequisition.findMany({
    where: { status: "APPROVED" },
    select: { vacancyId: true }
  });

  const vacancyIds = approvedReqs.map(r => r.vacancyId);

  if (vacancyIds.length > 0) {
    const updated = await prisma.vacancy.updateMany({
      where: {
        id: { in: vacancyIds },
        status: "pending_approval"
      },
      data: {
        status: "approved",
        isApproved: true
      }
    });
    console.log(`Successfully fixed ${updated.count} vacancies that were stuck in pending_approval status.`);
  } else {
    console.log("No approved requisitions found to sync.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
