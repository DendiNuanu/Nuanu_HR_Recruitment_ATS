import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { employee_id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const record = await prisma.probationRecord.findUnique({
      where: { employeeId: params.employee_id },
      include: {
        evaluations: {
          orderBy: { evaluationDate: "desc" }
        },
        extensions: {
          orderBy: { extendedAt: "desc" }
        }
      }
    });

    return NextResponse.json({ record }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
