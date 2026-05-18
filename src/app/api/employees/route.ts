import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: e.user.name,
      email: e.user.email,
      phone: e.user.phone,
      position: e.position,
      startDate: e.startDate.toISOString(),
      status: e.status,
      retained90: e.retained90,
      retained180: e.retained180,
      check90DueAt: e.check90DueAt?.toISOString() ?? null,
      check180DueAt: e.check180DueAt?.toISOString() ?? null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
