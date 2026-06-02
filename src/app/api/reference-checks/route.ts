import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasSession(roles: string[] = []) {
  return roles.length >= 0;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !hasSession(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId required" },
      { status: 400 },
    );
  }

  const checks = await prisma.referenceCheck.findMany({
    where: { candidateId: applicationId },
    orderBy: { referenceNo: "asc" },
  });

  return NextResponse.json(checks);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasSession(session.roles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    applicationId?: string;
    referenceNo?: number;
    agencyName?: string;
    telephone?: string;
    jobTitle?: string;
  };

  if (!body.applicationId) {
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 },
    );
  }

  const referenceNo = Number(body.referenceNo || 1);
  const check = await prisma.referenceCheck.upsert({
    where: {
      candidateId_referenceNo: {
        candidateId: body.applicationId,
        referenceNo,
      },
    },
    update: {
      agencyName: body.agencyName?.trim() || null,
      telephone: body.telephone?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      conductedBy: session.id,
      conductedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      candidateId: body.applicationId,
      referenceNo,
      agencyName: body.agencyName?.trim() || null,
      telephone: body.telephone?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      conductedBy: session.id,
      conductedAt: new Date(),
    },
  });

  return NextResponse.json(check, { status: 201 });
}
