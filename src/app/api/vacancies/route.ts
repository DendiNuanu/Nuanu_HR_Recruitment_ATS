/**
 * GET /api/vacancies — paginated vacancy list
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const departmentId = searchParams.get("departmentId") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, vacancies] = await Promise.all([
    prisma.vacancy.count({ where }),
    prisma.vacancy.findMany({
      where,
      include: {
        department: { select: { name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    vacancies: vacancies.map((v) => ({
      id: v.id,
      title: v.title,
      code: v.code,
      department: v.department?.name ?? "Unknown",
      location: v.location,
      employmentType: v.employmentType,
      headcount: v.headcount,
      filledCount: v.filledCount,
      status: v.status,
      applicationCount: v._count.applications,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
