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
  const now = new Date();

  const hiredApps = await prisma.application.findMany({
    where: {
      deletedAt: null,
      OR: [{ currentStage: "hired" }, { status: "hired" }],
      updatedAt: { gte: startDate, lt: endDate },
    },
    include: { offer: { select: { respondedAt: true } } },
  });

  const cutoff90 = new Date(now.getTime() - 90 * 86_400_000);
  const cutoff180 = new Date(now.getTime() - 180 * 86_400_000);

  const hires90 = hiredApps.filter((a) => {
    const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
    return hiredAt < cutoff90;
  });

  const retained90 = hires90.filter((a) => {
    if (a.rejectedAt) {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return a.rejectedAt < hiredAt;
    }
    return true;
  });

  const hires180 = hiredApps.filter((a) => {
    const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
    return hiredAt < cutoff180;
  });

  const retained180 = hires180.filter((a) => {
    if (a.rejectedAt) {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return a.rejectedAt < hiredAt;
    }
    return true;
  });

  return NextResponse.json({
    year,
    retention90Days: {
      total: hires90.length,
      retained: retained90.length,
      rate: hires90.length > 0 ? Math.round((retained90.length / hires90.length) * 100) : null,
    },
    qualityOfHire6Months: {
      total: hires180.length,
      retained: retained180.length,
      rate: hires180.length > 0 ? Math.round((retained180.length / hires180.length) * 100) : null,
    },
  });
}
