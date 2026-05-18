import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let employees: any[] = [];
  try {
    const records = await prisma.employee.findMany({
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    employees = records.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: e.user.name,
      email: e.user.email,
      phone: e.user.phone,
      position: e.position,
      startDate: e.startDate.toISOString(),
      status: e.status,
      retained90: e.retained90,
      retained180: e.retained180,
      check90DueAt: e.check90DueAt?.toISOString() ?? null,
      check180DueAt: e.check180DueAt?.toISOString() ?? null,
    }));
  } catch {
    // Table may not exist yet — show empty state
  }

  return <EmployeesClient employees={employees} />;
}
