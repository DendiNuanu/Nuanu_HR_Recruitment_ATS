import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { employee_id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employee_id } = params;

  try {
    const assets = await prisma.employeeAsset.findMany({
      where: { employeeId: employee_id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ assets }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}
