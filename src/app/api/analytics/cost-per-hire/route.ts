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

  const [hiredApps, channelCosts] = await Promise.all([
    prisma.application.findMany({
      where: {
        deletedAt: null,
        OR: [{ currentStage: "hired" }, { status: "hired" }],
        updatedAt: { gte: startDate, lt: endDate },
      },
      select: { source: true },
    }),
    prisma.recruitmentChannelCost.findMany({ where: { year } }),
  ]);

  const totalHires = hiredApps.length;

  // Build cost map from DB
  const costMap = new Map(channelCosts.map((c) => [c.channel.toLowerCase(), c.cost]));

  // Fallback hardcoded costs (IDR) if not in DB
  const FALLBACK: Record<string, number> = {
    linkedin: 5_000_000, seek: 3_000_000,
    loker_bali: 1_000_000, other: 500_000,
    referral: 0, direct: 0, internal: 0,
  };

  const getCost = (channel: string) =>
    costMap.get(channel) ?? FALLBACK[channel] ?? FALLBACK.other;

  // Group hires by source
  const sourceMap = new Map<string, number>();
  for (const a of hiredApps) {
    const src = (a.source || "direct").toLowerCase();
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
  }

  const channelBreakdown = Array.from(sourceMap.entries()).map(([channel, hires]) => {
    const cost = getCost(channel) * hires;
    return {
      channel: channel.charAt(0).toUpperCase() + channel.slice(1).replace(/_/g, " "),
      hires,
      totalCost: cost,
      costPerHire: hires > 0 ? Math.round(cost / hires) : 0,
    };
  });

  const totalCost = channelBreakdown.reduce((s, c) => s + c.totalCost, 0);
  const overallCostPerHire = totalHires > 0 ? Math.round(totalCost / totalHires) : 0;

  return NextResponse.json({
    year, totalHires, totalCost, overallCostPerHire, channelBreakdown,
  });
}
