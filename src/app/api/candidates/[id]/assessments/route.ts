import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;

  const assessments = await prisma.assessment.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, type: true, status: true,
      score: true, maxScore: true, passThreshold: true,
      isPassed: true, completedAt: true, createdAt: true,
    },
  });

  return NextResponse.json(assessments);
}
