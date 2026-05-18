/**
 * GET  /api/offers  — list all offers with filters
 * POST /api/offers  — create a new offer
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [total, offers] = await Promise.all([
    prisma.offer.count({ where }),
    prisma.offer.findMany({
      where,
      include: {
        application: {
          include: {
            candidate: { select: { name: true, email: true } },
            vacancy: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    offers: offers.map((o) => ({
      id: o.id,
      applicationId: o.applicationId,
      candidateName: o.application.candidate.name,
      candidateEmail: o.application.candidate.email,
      position: o.application.vacancy.title,
      salary: o.salary,
      currency: o.currency,
      status: o.status,
      startDate: o.startDate?.toISOString() ?? null,
      expiresAt: o.expiresAt?.toISOString() ?? null,
      sentAt: o.sentAt?.toISOString() ?? null,
      respondedAt: o.respondedAt?.toISOString() ?? null,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { applicationId, salary, currency = "IDR", bonus, benefits, equity, startDate, expiresAt, notes } = body;

  if (!applicationId || !salary) {
    return NextResponse.json({ error: "applicationId and salary are required" }, { status: 400 });
  }

  const existing = await prisma.offer.findUnique({ where: { applicationId } });
  if (existing) {
    return NextResponse.json({ error: "An offer already exists for this application" }, { status: 409 });
  }

  const offer = await prisma.offer.create({
    data: {
      applicationId,
      salary: Number(salary),
      currency,
      bonus: bonus ? Number(bonus) : null,
      benefits: benefits || null,
      equity: equity || null,
      startDate: startDate ? new Date(startDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null,
      status: "draft",
    },
  });

  return NextResponse.json(offer, { status: 201 });
}
