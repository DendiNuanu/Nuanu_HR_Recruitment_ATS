import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: id },
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    if (!employee)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ employee }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { phone, department, position } = body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { phone },
      });
    }

    const empData: any = {};
    if (department !== undefined) empData.department = department;
    if (position !== undefined) empData.position = position;

    if (Object.keys(empData).length > 0) {
      await prisma.employee.update({
        where: { id },
        data: empData,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
