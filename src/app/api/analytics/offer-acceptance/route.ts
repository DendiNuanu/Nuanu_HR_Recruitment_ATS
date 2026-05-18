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

  const offers = await prisma.offer.findMany({
    where: { sentAt: { gte: startDate, lt: endDate } },
    select: { status: true, sentAt: true, respondedAt: true },
  });

  const sent = offers.filter((o) => ["sent", "accepted", "rejected", "expired"].includes(o.status));
  const accepted = offers.filter((o) => o.status === "accepted");

  const rate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : null;

  return NextResponse.json({
    year,
    totalSent: sent.length,
    totalAccepted: accepted.length,
    totalRejected: offers.filter((o) => o.status === "rejected").length,
    acceptanceRate: rate,
  });
}
