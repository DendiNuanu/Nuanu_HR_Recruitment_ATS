import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("nuanu123", 10);

  // 1. Ensure Roles exist
  const roles = [
    { name: "HR Manager", slug: "hr" },
    { name: "Finance Manager", slug: "finance" },
    { name: "Hiring Manager", slug: "manager" }
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        name: r.name,
        slug: r.slug,
        isSystem: true
      }
    });
    console.log(`Role ${r.slug} checked/created`);
  }

  // 2. Create HR Account
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@nuanu.com" },
    update: { password },
    create: {
      email: "hr@nuanu.com",
      password,
      name: "HR Sarah",
    }
  });
  
  const hrRole = await prisma.role.findUnique({ where: { slug: "hr" } });
  if (hrRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: hrUser.id, roleId: hrRole.id } },
      update: {},
      create: { userId: hrUser.id, roleId: hrRole.id }
    });
  }
  console.log("HR Account: hr@nuanu.com / nuanu123");

  // 3. Create Finance Account
  const financeUser = await prisma.user.upsert({
    where: { email: "finance@nuanu.com" },
    update: { password },
    create: {
      email: "finance@nuanu.com",
      password,
      name: "Finance Budi",
    }
  });

  const financeRole = await prisma.role.findUnique({ where: { slug: "finance" } });
  if (financeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: financeUser.id, roleId: financeRole.id } },
      update: {},
      create: { userId: financeUser.id, roleId: financeRole.id }
    });
  }
  console.log("Finance Account: finance@nuanu.com / nuanu123");

  // 4. Create a Manager Account (optional but good for testing)
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@nuanu.com" },
    update: { password },
    create: {
      email: "manager@nuanu.com",
      password,
      name: "Manager Andi",
    }
  });

  const managerRole = await prisma.role.findUnique({ where: { slug: "manager" } });
  if (managerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
      update: {},
      create: { userId: managerUser.id, roleId: managerRole.id }
    });
  }
  console.log("Manager Account: manager@nuanu.com / nuanu123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
