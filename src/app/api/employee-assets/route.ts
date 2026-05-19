import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId query param required" }, { status: 400 });
  }

  try {
    const assets = await prisma.employeeAsset.findMany({
      where: { employeeId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ assets }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { employee_id, onboarding_id, asset_type, asset_name, serial_number, assigned_date, notes, status } = body;

    if (!employee_id || !asset_type || !asset_name) {
      return NextResponse.json({ error: "employee_id, asset_type, and asset_name are required" }, { status: 400 });
    }

    const asset = await prisma.employeeAsset.create({
      data: {
        employeeId: employee_id,
        onboardingId: onboarding_id || null,
        assetType: asset_type,
        assetName: asset_name,
        serialNumber: serial_number || null,
        assignedDate: assigned_date ? new Date(assigned_date) : null,
        notes: notes || null,
        status: status || "pending",
        assignedBy: session.id,
      },
    });

    return NextResponse.json({ asset_id: asset.id }, { status: 201 });
  } catch (error: any) {
    console.error("Create asset error:", error);
    return NextResponse.json({ error: error.message || "Failed to create asset" }, { status: 500 });
  }
}
