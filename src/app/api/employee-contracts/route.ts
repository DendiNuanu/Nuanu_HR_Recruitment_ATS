import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { employee_id, action, ...data } = body;

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  if (action !== "draft" && action !== "finalize") {
    return NextResponse.json({ error: "Invalid action. Must be 'draft' or 'finalize'" }, { status: 400 });
  }

  if (!data.basicSalary || Number(data.basicSalary) <= 0) {
    return NextResponse.json({ error: "basicSalary is required and must be positive" }, { status: 400 });
  }

  if (!data.contractStart) {
    return NextResponse.json({ error: "contractStart is required" }, { status: 400 });
  }

  // 1. Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: employee_id },
    include: { employeeContract: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // 2. Reject if duplicate finalized contract
  if (employee.employeeContract && employee.employeeContract.status === "finalized") {
    return NextResponse.json({ error: "A finalized contract already exists for this employee" }, { status: 409 });
  }

  // 3. Save the contract
  const contractData = {
    employeeId: employee_id,
    employmentType: data.employmentType || "Full Time",
    contractStart: new Date(data.contractStart),
    contractEnd: data.contractEnd && !data.isPermanent ? new Date(data.contractEnd) : null,
    isPermanent: Boolean(data.isPermanent),
    workLocation: data.workLocation || "Onsite",
    workingHours: data.workingHours || "08:00–17:00, Mon–Fri",
    reportingTo: data.reportingTo || "",
    salaryType: data.salaryType || "Gross",
    basicSalary: Number(data.basicSalary),
    mealAllowance: Number(data.mealAllowance) || 0,
    transportAllowance: Number(data.transportAllowance) || 0,
    healthAllowance: Number(data.healthAllowance) || 0,
    otherAllowanceLabel: data.otherAllowanceLabel || null,
    otherAllowanceAmount: Number(data.otherAllowanceAmount) || 0,
    laptopProvided: Boolean(data.laptopProvided),
    laptopType: data.laptopType || null,
    companyEmail: data.companyEmail || null,
    nametagRequired: Boolean(data.nametagRequired),
    lunchProvided: Boolean(data.lunchProvided),
    accessCard: Boolean(data.accessCard),
    notes: data.notes || null,
    status: action, // "draft" or "finalized"
  };

  let contract;
  if (employee.employeeContract) {
    // Update existing draft
    contract = await prisma.employeeContract.update({
      where: { id: employee.employeeContract.id },
      data: contractData,
    });
  } else {
    // Create new
    contract = await prisma.employeeContract.create({
      data: contractData,
    });
  }

  // 4. If finalize, update onboarding status
  if (action === "finalize") {
    await prisma.onboarding.update({
      where: { employeeId: employee_id },
      data: { onboardingStatus: "new_hire_confirmation" },
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: employee.userId,
        action: `Generated Memo Hire and finalized contract for ${employee.employeeCode}`,
        resource: "EmployeeContract",
        resourceId: contract.id,
      },
    });
  }

  revalidatePath("/dashboard/onboarding");

  return NextResponse.json({ contract_id: contract.id, success: true }, { status: 200 });
}
