/**
 * POST /api/employees/convert-from-offer
 *
 * Converts an accepted offer into an Employee record + Onboarding tasks.
 * Sets offer.status = "converted".
 *
 * Body: { offerId, startDate, entity, employmentType, department, probationPeriod }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateEmployeeCode(year: number, seq: number): string {
  return `EMP-${year}-${String(seq).padStart(3, "0")}`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { offerId, startDate, entity, employmentType, department, probationPeriod } = body as {
    offerId: string;
    startDate: string;
    entity: string;
    employmentType: string;
    department: string;
    probationPeriod?: string;
  };

  // ── Validate required fields ───────────────────────────────────────────────
  if (!offerId || !startDate || !entity || !employmentType || !department) {
    return NextResponse.json(
      { error: "offerId, startDate, entity, employmentType, and department are required" },
      { status: 400 },
    );
  }

  // ── Fetch offer ────────────────────────────────────────────────────────────
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      application: {
        include: {
          candidate: { select: { id: true, name: true, email: true, phone: true } },
          vacancy: { select: { title: true, departmentId: true } },
        },
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.status !== "accepted") {
    return NextResponse.json(
      { error: "Only accepted offers can be converted to employees" },
      { status: 400 },
    );
  }

  const candidate = offer.application.candidate;

  // ── Check for duplicate conversion ────────────────────────────────────────
  const existingEmployee = await prisma.employee.findUnique({
    where: { userId: candidate.id },
  });

  if (existingEmployee) {
    return NextResponse.json(
      { error: "An employee record already exists for this candidate", employeeId: existingEmployee.id },
      { status: 409 },
    );
  }

  // ── Generate unique employee code ─────────────────────────────────────────
  const year = new Date().getFullYear();
  const countThisYear = await prisma.employee.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const employeeCode = generateEmployeeCode(year, countThisYear + 1);

  // ── Calculate probation end date ──────────────────────────────────────────
  let probationEndDate: Date | null = null;
  if (probationPeriod && probationPeriod !== "none") {
    const start = new Date(startDate);
    const months = probationPeriod === "1_month" ? 1 : probationPeriod === "3_months" ? 3 : 6;
    probationEndDate = new Date(start);
    probationEndDate.setMonth(probationEndDate.getMonth() + months);
  }

  const startDateObj = new Date(startDate);

  // ── Create Employee + update Offer + create Onboarding tasks ──────────────
  const [employee] = await prisma.$transaction(async (tx) => {
    // 1. Create Employee record
    const emp = await tx.employee.create({
      data: {
        userId: candidate.id,
        employeeCode,
        position: offer.application.vacancy.title,
        departmentId: offer.application.vacancy.departmentId ?? null,
        startDate: startDateObj,
        status: "active",
        check90DueAt: new Date(startDateObj.getTime() + 90 * 24 * 60 * 60 * 1000),
        check180DueAt: new Date(startDateObj.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. Update offer status to "converted"
    await tx.offer.update({
      where: { id: offerId },
      data: { status: "converted" },
    });

    // 3. Update application stage to "hired"
    await tx.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "hired", status: "hired" },
    });

    // 4. Create default onboarding tasks
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const defaultTasks = [
      { title: "Submit identification documents (KTP/Passport)", category: "documentation", priority: 1 },
      { title: "Submit NPWP (Tax Number)", category: "documentation", priority: 1 },
      { title: "Submit BPJS Health Insurance details", category: "documentation", priority: 1 },
      { title: "Submit bank account details for payroll", category: "admin", priority: 1 },
      { title: "Sign employment contract", category: "documentation", priority: 1 },
      { title: "Submit emergency contact information", category: "documentation", priority: 2 },
      { title: "Attend orientation session", category: "training", priority: 2 },
      { title: "Setup workstation and company email", category: "it_setup", priority: 2 },
    ];

    await tx.onboardingTask.createMany({
      data: defaultTasks.map((t) => ({
        employeeId: emp.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: "pending",
        dueDate,
      })),
    });

    // 5. Log activity
    await tx.activityLog.create({
      data: {
        userId: candidate.id,
        action: `Converted to employee (${employeeCode}) — ${entity}, ${employmentType}`,
        resource: "Employee",
        resourceId: emp.id,
      },
    });

    return [emp];
  });

  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/onboarding");

  return NextResponse.json(
    {
      success: true,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
    },
    { status: 201 },
  );
}
