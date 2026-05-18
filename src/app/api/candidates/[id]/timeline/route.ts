import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;

  // Get the application to find the candidateId
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { candidateId: true },
  });

  if (!application) return NextResponse.json([], { status: 200 });

  const logs = await prisma.activityLog.findMany({
    where: {
      OR: [
        { resourceId: applicationId },
        { userId: application.candidateId, resource: "Application" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { action: true, createdAt: true },
  });

  return NextResponse.json(
    logs.map((l) => ({
      action: l.action,
      createdAt: l.createdAt.toISOString(),
    }))
  );
}
