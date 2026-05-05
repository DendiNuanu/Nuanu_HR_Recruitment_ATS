import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !["admin", "super-admin", "finance"].some(r => session.roles.includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { vacancyId, salaryMin, salaryMax } = await req.json();

    const updated = await prisma.vacancy.update({
      where: { id: vacancyId },
      data: {
        salaryMin: parseFloat(salaryMin),
        salaryMax: parseFloat(salaryMax),
      }
    });

    return NextResponse.json({ success: true, vacancy: updated });
  } catch (error: any) {
    console.error("API Error (Update Salary):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
