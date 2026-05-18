import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
