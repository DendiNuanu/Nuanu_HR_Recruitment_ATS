import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Create Default Departments
  const engineering = await prisma.department.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", code: "ENG", description: "Software development and infrastructure" },
  });

  const hr = await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: { name: "Human Resources", code: "HR", description: "Talent acquisition and management" },
  });

  // 2. Create Default Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: { name: "Super Admin", slug: "super-admin" },
  });

  const recruiterRole = await prisma.role.upsert({
    where: { name: "Recruiter" },
    update: {},
    create: { name: "Recruiter", slug: "recruiter" },
  });

  // 3. Create Demo Users
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@nuanu.com" },
    update: {},
    create: {
      email: "admin@nuanu.com",
      password: hashedPassword,
      name: "Super Admin",
      departmentId: hr.id,
      userRoles: {
        create: {
          roleId: adminRole.id,
        }
      }
    },
  });

  // 4. Create Demo Vacancies
  const seniorDev = await prisma.vacancy.create({
    data: {
      title: "Senior Full Stack Engineer",
      code: "ENG-001",
      departmentId: engineering.id,
      location: "Remote / Hybrid",
      employmentType: "Full-Time",
      experienceMin: 5,
      description: "We are looking for an experienced Full Stack Engineer with strong Next.js and PostgreSQL skills.",
      requirements: "- 5+ years React/Next.js\n- Node.js backend experience\n- Strong SQL knowledge",
      status: "published",
      creatorId: superAdmin.id,
      headcount: 2,
    }
  });

  const productDesigner = await prisma.vacancy.create({
    data: {
      title: "Product Designer",
      code: "ENG-002",
      departmentId: engineering.id,
      location: "On-site (Bali HQ)",
      employmentType: "Full-Time",
      experienceMin: 3,
      description: "Looking for an exceptional product designer who specializes in SaaS interfaces.",
      requirements: "- Figma mastery\n- UX research experience",
      status: "published",
      creatorId: superAdmin.id,
      headcount: 1,
    }
  });

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
