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

  const hiredApps = await prisma.application.findMany({
    where: {
      deletedAt: null,
      OR: [{ currentStage: "hired" }, { status: "hired" }],
    },
    include: {
      offer: { select: { status: true, respondedAt: true } },
      vacancy: { select: { title: true } },
    },
  });

  const entries = hiredApps
    .filter((a) => {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return hiredAt.getFullYear() === year;
    })
    .map((a) => {
      const acceptedAt = a.offer?.respondedAt ?? a.updatedAt;
      const days = daysBetween(a.appliedAt, acceptedAt);
      return { position: a.vacancy.title, days: days < 500 ? days : 0 };
    })
    .filter((e) => e.days >= 0);

  const avg = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length)
    : 0;

  return NextResponse.json({ year, avgDays: avg, count: entries.length, entries });
}
