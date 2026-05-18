import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000));
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const departmentId = searchParams.get("departmentId") ?? "";

  const hiredApps = await prisma.application.findMany({
    where: {
      deletedAt: null,
      OR: [{ currentStage: "hired" }, { status: "hired" }],
      ...(departmentId ? { vacancy: { departmentId } } : {}),
    },
    include: {
      offer: { select: { status: true, respondedAt: true } },
      vacancy: { select: { title: true, department: { select: { name: true } }, publishedAt: true } },
    },
  });

  const requisitions = await prisma.jobRequisition.findMany({
    select: { vacancyId: true, createdAt: true },
  });
  const reqMap = new Map<string, Date>();
  for (const r of requisitions) {
    const ex = reqMap.get(r.vacancyId);
    if (!ex || r.createdAt < ex) reqMap.set(r.vacancyId, r.createdAt);
  }

  const entries = hiredApps
    .filter((a) => {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return hiredAt.getFullYear() === year;
    })
    .map((a) => {
      const acceptedAt = a.offer?.respondedAt ?? a.updatedAt;
      const startDate = reqMap.get(a.vacancyId) ?? a.vacancy.publishedAt ?? a.createdAt;
      const days = daysBetween(startDate, acceptedAt);
      return {
        position: a.vacancy.title,
        department: a.vacancy.department?.name ?? "Unknown",
        days: days < 500 ? days : 0,
      };
    })
    .filter((e) => e.days > 0);

  const avg = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length)
    : 0;

  return NextResponse.json({ year, avgDays: avg, count: entries.length, entries });
}
