import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { retained90, retained180 } = await request.json();

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(retained90 !== undefined && { retained90: Boolean(retained90) }),
      ...(retained180 !== undefined && { retained180: Boolean(retained180) }),
    },
  });

  return NextResponse.json(updated);
}
