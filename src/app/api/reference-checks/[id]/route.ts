import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    agencyName?: string;
    telephone?: string;
    cityState?: string;
    jobTitle?: string;
    recommendation?: string;
    workPerformance?: string;
    additionalNotes?: string;
    overallRating?: number | null;
  };

  const updated = await prisma.referenceCheck.update({
    where: { id },
    data: {
      ...(body.agencyName !== undefined && {
        agencyName: body.agencyName?.trim() || null,
      }),
      ...(body.telephone !== undefined && {
        telephone: body.telephone?.trim() || null,
      }),
      ...(body.cityState !== undefined && {
        cityState: body.cityState?.trim() || null,
      }),
      ...(body.jobTitle !== undefined && {
        jobTitle: body.jobTitle?.trim() || null,
      }),
      ...(body.recommendation !== undefined && {
        recommendation: body.recommendation?.trim() || null,
      }),
      ...(body.workPerformance !== undefined && {
        workPerformance: body.workPerformance?.trim() || null,
      }),
      ...(body.additionalNotes !== undefined && {
        additionalNotes: body.additionalNotes?.trim() || null,
      }),
      ...(body.overallRating !== undefined && {
        overallRating: body.overallRating ?? null,
      }),
      conductedBy: session.id,
      conductedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.referenceCheck.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
