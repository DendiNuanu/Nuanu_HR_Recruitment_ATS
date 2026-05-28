/**
 * Upsert demo users for Interview Results flow testing.
 * Run: npx tsx scratch/seed_interview_demo_users.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    name: "Maria Santos",
    email: "maria@nuanu.com",
    password: "maria1",
    roleSlug: "hr",
  },
  {
    name: "Alex Kumar",
    email: "alex@gmail.com",
    password: "alex12",
    roleSlug: "interviewer",
  },
  {
    name: "Emily Rodriguez",
    email: "emily@nuanu.com",
    password: "emily1",
    roleSlug: "manager",
  },
] as const;

async function upsertStaffUser({
  name,
  email,
  password,
  roleSlug,
  departmentId,
}: {
  name: string;
  email: string;
  password: string;
  roleSlug: string;
  departmentId: string | null;
}) {
  const role = await prisma.role.findUnique({ where: { slug: roleSlug } });
  if (!role) {
    throw new Error(`Role not found: ${roleSlug}`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name,
      password: hashedPassword,
      isActive: true,
      deletedAt: null,
      departmentId,
    },
    create: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      isActive: true,
      departmentId,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function main() {
  const hrDept =
    (await prisma.department.findFirst({
      where: { name: { contains: "Human", mode: "insensitive" } },
    })) ??
    (await prisma.department.findFirst({ orderBy: { name: "asc" } }));

  const opsDept =
    (await prisma.department.findFirst({
      where: { name: { contains: "Operations", mode: "insensitive" } },
    })) ?? hrDept;

  const engDept =
    (await prisma.department.findFirst({
      where: { name: { contains: "Engineering", mode: "insensitive" } },
    })) ?? hrDept;

  const deptByRole: Record<string, string | null> = {
    hr: hrDept?.id ?? null,
    interviewer: engDept?.id ?? hrDept?.id ?? null,
    manager: opsDept?.id ?? hrDept?.id ?? null,
  };

  console.log("Creating / updating interview demo users...\n");

  for (const demo of DEMO_USERS) {
    const user = await upsertStaffUser({
      ...demo,
      departmentId: deptByRole[demo.roleSlug] ?? null,
    });
    console.log(`✓ ${demo.name}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${demo.password}`);
    console.log(`  Role:     ${demo.roleSlug}\n`);
  }

  console.log("Done. Login credentials:");
  console.log("  Maria (HR):       maria@nuanu.com / maria1");
  console.log("  Alex (User 1):    alex@gmail.com / alex12");
  console.log("  Emily (User 2):   emily@nuanu.com / emily1");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
