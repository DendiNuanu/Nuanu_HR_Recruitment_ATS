import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requisitions = await prisma.jobRequisition.findMany({
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            code: true,
            salaryMin: true,
            salaryMax: true,
            department: { 
              include: { 
                budgets: {
                  where: { fiscalYear: new Date().getFullYear() },
                  take: 1
                }
              } 
            }
          }
        },
        approvals: {
          include: {
            approver: { select: { name: true, avatar: true } }
          },
          orderBy: { role: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[API] Fetched ${requisitions.length} requisitions`);
    return NextResponse.json(requisitions);
  } catch (error: any) {
    console.error("API Error (Requisition List):", error);
    return NextResponse.json({ error: "Failed to fetch requisitions" }, { status: 500 });
  }
}
