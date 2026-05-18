/**
 * GET  /api/reference-checks?applicationId=xxx  — list checks for an application
 * POST /api/reference-checks                     — create a new reference check
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });

  const checks = await prisma.referenceCheck.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checks);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { applicationId, refereeName, relationship, company, phone, email, notes } = body;

  if (!applicationId || !refereeName || !relationship) {
    return NextResponse.json({ error: "applicationId, refereeName, and relationship are required" }, { status: 400 });
  }

  const check = await prisma.referenceCheck.create({
    data: { applicationId, refereeName, relationship, company, phone, email, notes, status: "pending" },
  });

  return NextResponse.json(check, { status: 201 });
}
