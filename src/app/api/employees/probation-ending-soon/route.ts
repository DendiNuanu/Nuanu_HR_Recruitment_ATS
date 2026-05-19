import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employees = await prisma.employee.findMany({
      where: {
        status: "probation",
        probationRecord: {
          probationEndDate: {
            lte: thirtyDaysFromNow
          },
          outcome: null
        }
      },
      include: {
        user: { select: { name: true } },
        probationRecord: true
      },
      orderBy: {
        probationRecord: {
          probationEndDate: 'asc'
        }
      }
    });

    return NextResponse.json({ employees }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
