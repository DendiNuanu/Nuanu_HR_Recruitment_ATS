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

  const apps = await prisma.application.findMany({
    where: { deletedAt: null, createdAt: { gte: startDate, lt: endDate } },
    select: { source: true, currentStage: true, status: true },
  });

  const map = new Map<string, { count: number; hires: number }>();
  for (const a of apps) {
    const src = (a.source || "direct").toLowerCase();
    const e = map.get(src) ?? { count: 0, hires: 0 };
    e.count++;
    if (a.currentStage === "hired" || a.status === "hired") e.hires++;
    map.set(src, e);
  }

  const total = apps.length;
  const totalHires = apps.filter((a) => a.currentStage === "hired" || a.status === "hired").length;

  const breakdown = Array.from(map.entries())
    .map(([source, d]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " "),
      count: d.count,
      hires: d.hires,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
      hireRate: d.count > 0 ? Math.round((d.hires / d.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ year, total, totalHires, breakdown });
}
