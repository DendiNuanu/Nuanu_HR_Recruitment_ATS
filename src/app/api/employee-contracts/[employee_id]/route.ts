import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employee_id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employee_id } = await params;
  if (!employee_id) {
    return NextResponse.json(
      { error: "employee_id is required" },
      { status: 400 },
    );
  }

  const contract = await prisma.employeeContract.findUnique({
    where: { employeeId: employee_id },
  });

  return NextResponse.json({ contract }, { status: 200 });
}
