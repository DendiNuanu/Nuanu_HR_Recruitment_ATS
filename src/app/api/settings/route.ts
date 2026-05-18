/**
 * GET /api/settings  — fetch all system settings as key-value map
 * PUT /api/settings  — upsert multiple settings
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as Record<string, string>;

  try {
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[settings PUT]", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
