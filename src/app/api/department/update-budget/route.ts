import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !["admin", "super-admin", "finance"].some(r => session.roles.includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { departmentId, totalAmount } = await req.json();
    const currentYear = new Date().getFullYear();

    const updated = await prisma.budget.upsert({
      where: {
        departmentId_fiscalYear: {
          departmentId,
          fiscalYear: currentYear
        }
      },
      update: { totalAmount: parseFloat(totalAmount) },
      create: {
        departmentId,
        fiscalYear: currentYear,
        totalAmount: parseFloat(totalAmount),
        spentAmount: 0,
        currency: "IDR"
      }
    });

    return NextResponse.json({ success: true, budget: updated });
  } catch (error: any) {
    console.error("API Error (Update Budget):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
