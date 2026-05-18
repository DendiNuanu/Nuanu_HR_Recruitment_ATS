import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year + 1}-01-01`);

  const [interviews, hiredApps] = await Promise.all([
    prisma.interview.findMany({
      where: { scheduledAt: { gte: startDate, lt: endDate }, status: { not: "cancelled" } },
      select: { applicationId: true },
    }),
    prisma.application.findMany({
      where: {
        deletedAt: null,
        OR: [{ currentStage: "hired" }, { status: "hired" }],
        updatedAt: { gte: startDate, lt: endDate },
      },
      select: { id: true },
    }),
  ]);

  const interviewedCount = new Set(interviews.map((i) => i.applicationId)).size;
  const hiredCount = hiredApps.length;
  const ratio = interviewedCount > 0 ? Math.round((hiredCount / interviewedCount) * 100) : null;

  return NextResponse.json({
    year, interviewedCount, hiredCount, yieldRatio: ratio,
  });
}
