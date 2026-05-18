import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, notes, salary, startDate, expiresAt } = body;

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(salary !== undefined && { salary: Number(salary) }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(status === "accepted" && { respondedAt: new Date() }),
      ...(status === "rejected" && { respondedAt: new Date() }),
      ...(status === "sent" && { sentAt: new Date() }),
    },
  });

  return NextResponse.json(updated);
}
