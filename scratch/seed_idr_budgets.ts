import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const currentYear = new Date().getFullYear();
  
  // Find all departments
  const depts = await prisma.department.findMany();

  for (const dept of depts) {
    // Upsert a budget for IDR
    await prisma.budget.upsert({
      where: {
        departmentId_fiscalYear: {
          departmentId: dept.id,
          fiscalYear: currentYear
        }
      },
      update: {
        totalAmount: 1000000000, // 1 Billion IDR
        spentAmount: 250000000,   // 250 Million IDR
        currency: "IDR"
      },
      create: {
        departmentId: dept.id,
        fiscalYear: currentYear,
        totalAmount: 1000000000,
        spentAmount: 250000000,
        currency: "IDR"
      }
    });
    console.log(`Updated IDR budget for ${dept.name}`);
  }

  // Update vacancies to have IDR salaries
  await prisma.vacancy.updateMany({
    data: {
      salaryMin: 15000000, // 15jt
      salaryMax: 25000000, // 25jt
      currency: "IDR"
    }
  });
  console.log("Updated vacancies with IDR salary ranges");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
