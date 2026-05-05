import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Get our specialized users
  const hrUser = await prisma.user.findUnique({ where: { email: "hr@nuanu.com" } });
  const financeUser = await prisma.user.findUnique({ where: { email: "finance@nuanu.com" } });
  const managerUser = await prisma.user.findUnique({ where: { email: "manager@nuanu.com" } });

  if (!hrUser || !financeUser || !managerUser) {
    console.error("Specialized users not found. Run create_approval_accounts.ts first.");
    return;
  }

  // 2. Update all pending approvals to point to the correct specialized users
  // This ensures the "authorized approver" error goes away.
  
  await prisma.approval.updateMany({
    where: { role: "HR", status: "PENDING" },
    data: { approverId: hrUser.id }
  });

  await prisma.approval.updateMany({
    where: { role: "FINANCE", status: "PENDING" },
    data: { approverId: financeUser.id }
  });

  await prisma.approval.updateMany({
    where: { role: "MANAGER", status: "PENDING" },
    data: { approverId: managerUser.id }
  });

  console.log("All existing pending approvals have been reassigned to specialized accounts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
