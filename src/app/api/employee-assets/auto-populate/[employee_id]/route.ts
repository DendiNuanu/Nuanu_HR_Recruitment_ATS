import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { employee_id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employee_id } = params;

  try {
    // Fetch the employee's contract
    const contract = await prisma.employeeContract.findUnique({
      where: { employeeId: employee_id },
    });

    // Fetch the employee's onboarding
    const onboarding = await prisma.onboarding.findUnique({
      where: { employeeId: employee_id },
    });

    if (!contract) {
      return NextResponse.json({ created_count: 0, assets: [], message: "No contract found" }, { status: 200 });
    }

    // Existing asset types for this employee
    const existing = await prisma.employeeAsset.findMany({
      where: { employeeId: employee_id },
      select: { assetType: true },
    });
    const existingTypes = new Set(existing.map((a) => a.assetType));

    const toCreate: { assetType: string; assetName: string }[] = [];

    if (contract.laptopProvided && !existingTypes.has("laptop")) {
      toCreate.push({ assetType: "laptop", assetName: contract.laptopType || "Laptop" });
    }
    if (contract.companyEmail && !existingTypes.has("company_email")) {
      toCreate.push({ assetType: "company_email", assetName: contract.companyEmail });
    }
    if (contract.nametagRequired && !existingTypes.has("nametag")) {
      toCreate.push({ assetType: "nametag", assetName: "Nametag" });
    }
    if (contract.lunchProvided && !existingTypes.has("lunch_access")) {
      toCreate.push({ assetType: "lunch_access", assetName: "Lunch Access" });
    }
    if (contract.accessCard && !existingTypes.has("access_card")) {
      toCreate.push({ assetType: "access_card", assetName: "Access Card" });
    }

    const created = await Promise.all(
      toCreate.map((item) =>
        prisma.employeeAsset.create({
          data: {
            employeeId: employee_id,
            onboardingId: onboarding?.id || null,
            assetType: item.assetType,
            assetName: item.assetName,
            status: "pending",
            assignedBy: session.id,
          },
        })
      )
    );

    return NextResponse.json({ created_count: created.length, assets: created }, { status: 200 });
  } catch (error: any) {
    console.error("Auto-populate error:", error);
    return NextResponse.json({ error: "Failed to auto-populate assets" }, { status: 500 });
  }
}
