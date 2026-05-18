/**
 * PATCH /api/reference-checks/[id]  — update status, feedback, rating
 * DELETE /api/reference-checks/[id] — remove a reference check
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, feedback, rating, notes, recommendation } = body;

  const updated = await prisma.referenceCheck.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(feedback !== undefined && { feedback }),
      ...(rating !== undefined && { rating: Number(rating) }),
      ...(notes !== undefined && { notes }),
      ...(recommendation !== undefined && { recommendation }),
      ...(status === "verified" && { checkedById: session.id, checkedAt: new Date() }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.referenceCheck.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
