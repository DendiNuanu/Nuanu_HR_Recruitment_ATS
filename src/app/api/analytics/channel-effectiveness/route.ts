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

  const [apps, channelCosts] = await Promise.all([
    prisma.application.findMany({
      where: { deletedAt: null, createdAt: { gte: startDate, lt: endDate } },
      select: { source: true, currentStage: true, status: true },
    }),
    prisma.recruitmentChannelCost.findMany({ where: { year } }),
  ]);

  const costMap = new Map(channelCosts.map((c) => [c.channel.toLowerCase(), { cost: c.cost, currency: c.currency }]));

  const FALLBACK: Record<string, number> = {
    linkedin: 5_000_000, jobstreet: 3_000_000,
    loker_bali: 1_000_000, other: 500_000,
    referral: 0, direct: 0, internal: 0,
  };

  const sourceMap = new Map<string, { applications: number; hires: number }>();
  for (const a of apps) {
    const src = (a.source || "direct").toLowerCase();
    const e = sourceMap.get(src) ?? { applications: 0, hires: 0 };
    e.applications++;
    if (a.currentStage === "hired" || a.status === "hired") e.hires++;
    sourceMap.set(src, e);
  }

  const channels = Array.from(sourceMap.entries()).map(([channel, d]) => {
    const dbCost = costMap.get(channel);
    const unitCost = dbCost?.cost ?? FALLBACK[channel] ?? FALLBACK.other;
    const totalCost = unitCost * d.hires;
    return {
      channel: channel.charAt(0).toUpperCase() + channel.slice(1).replace(/_/g, " "),
      applications: d.applications,
      hires: d.hires,
      conversionRate: d.applications > 0 ? Math.round((d.hires / d.applications) * 100) : 0,
      totalCost,
      costPerHire: d.hires > 0 ? Math.round(totalCost / d.hires) : 0,
      currency: dbCost?.currency ?? "IDR",
      isFromDb: !!dbCost,
    };
  }).sort((a, b) => b.hires - a.hires);

  return NextResponse.json({ year, channels });
}
