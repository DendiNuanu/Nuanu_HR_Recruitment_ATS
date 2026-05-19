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
  const { offer_id, candidate_id, start_date, entity, employment_type, department, probation_period } = body as {
    offer_id: string;
    candidate_id: string;
    start_date: string;
    entity: string;
    employment_type: string;
    department: string;
    probation_period?: string;
  };

  // ── Validate required fields ───────────────────────────────────────────────
  if (!offer_id || !start_date || !entity || !employment_type || !department) {
    return NextResponse.json(
      { error: "offer_id, start_date, entity, employment_type, and department are required" },
      { status: 400 },
    );
  }

  // ── Fetch offer ────────────────────────────────────────────────────────────
  const offer = await prisma.offer.findUnique({
    where: { id: offer_id },
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

  // Verify candidate_id if provided
  if (candidate_id && candidate.id !== candidate_id) {
    return NextResponse.json({ error: "Candidate ID mismatch" }, { status: 400 });
  }

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
  if (probation_period && probation_period !== "none") {
    const start = new Date(start_date);
    const months = probation_period === "1_month" ? 1 : probation_period === "3_months" ? 3 : 6;
    probationEndDate = new Date(start);
    probationEndDate.setMonth(probationEndDate.getMonth() + months);
  }

  const startDateObj = new Date(start_date);

  // ── Create Employee + update Offer + create Onboarding tasks ──────────────
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Employee record
    const emp = await tx.employee.create({
      data: {
        userId: candidate.id,
        employeeCode,
        position: offer.application.vacancy.title,
        departmentId: offer.application.vacancy.departmentId ?? null,
        startDate: startDateObj,
        status: "active",
        entity,
        employmentType: employment_type,
        department,
        probationPeriod: probation_period,
        probationEndDate,
        check90DueAt: new Date(startDateObj.getTime() + 90 * 24 * 60 * 60 * 1000),
        check180DueAt: new Date(startDateObj.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. Update offer status to "converted"
    await tx.offer.update({
      where: { id: offer_id },
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

    // 5. Create Onboarding record
    const onboarding = await tx.onboarding.create({
      data: {
        employeeId: emp.id,
        onboardingStatus: "document_collection",
      },
    });

    // 6. Log activity
    await tx.activityLog.create({
      data: {
        userId: candidate.id,
        action: `Converted to employee (${employeeCode}) — ${entity}, ${employment_type}`,
        resource: "Employee",
        resourceId: emp.id,
      },
    });

    return { emp, onboarding };
  });

  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/onboarding");

  return NextResponse.json(
    {
      success: true,
      employee_id: result.emp.id,
      employee_code: result.emp.employeeCode,
      onboarding_id: result.onboarding.id,
    },
    { status: 201 },
  );
}
