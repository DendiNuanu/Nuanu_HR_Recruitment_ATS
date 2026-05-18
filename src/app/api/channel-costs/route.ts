/**
 * GET  /api/channel-costs?year=2026  — list costs for a year
 * POST /api/channel-costs            — upsert a channel cost
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const costs = await prisma.recruitmentChannelCost.findMany({
    where: { year },
    orderBy: { channel: "asc" },
  });

  return NextResponse.json(costs);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { channel, cost, currency = "IDR", year, notes } = body;

  if (!channel || cost === undefined || !year) {
    return NextResponse.json({ error: "channel, cost, and year are required" }, { status: 400 });
  }

  const record = await prisma.recruitmentChannelCost.upsert({
    where: { channel_year: { channel: channel.toLowerCase(), year: Number(year) } },
    update: { cost: Number(cost), currency, notes },
    create: { channel: channel.toLowerCase(), cost: Number(cost), currency, year: Number(year), notes },
  });

  return NextResponse.json(record);
}
