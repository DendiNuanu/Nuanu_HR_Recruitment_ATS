import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function canManageReferenceChecks(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase());
  return normalized.some((role) =>
    ["admin", "hr_manager", "hr", "recruiter"].includes(role),
  );
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageReferenceChecks(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: candidateId } = await params;

  const referenceChecks = await prisma.referenceCheck.findMany({
    where: { candidateId },
    orderBy: { referenceNo: "asc" },
    include: {
      conductor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ referenceChecks });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageReferenceChecks(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: candidateId } = await params;
  const body = await req.json();
  const { referenceNo, ...fields } = body as {
    referenceNo: number;
    [key: string]: unknown;
  };

  if (![1, 2, 3].includes(referenceNo)) {
    return NextResponse.json(
      { error: "referenceNo must be 1, 2, or 3" },
      { status: 400 },
    );
  }

  const referenceCheck = await prisma.referenceCheck.upsert({
    where: {
      candidateId_referenceNo: {
        candidateId,
        referenceNo,
      },
    },
    update: {
      ...fields,
      conductedBy: session.id,
      updatedAt: new Date(),
    },
    create: {
      candidateId,
      referenceNo,
      conductedBy: session.id,
      ...fields,
    },
    include: {
      conductor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ referenceCheck });
}
