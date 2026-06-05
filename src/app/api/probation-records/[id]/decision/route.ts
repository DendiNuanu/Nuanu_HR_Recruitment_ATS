import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    const { decision, reason, extend_months } = body;

    const probationRecord = await prisma.probationRecord.findUnique({
      where: { id },
    });

    if (!probationRecord) {
      return NextResponse.json(
        { error: "Probation record not found" },
        { status: 404 },
      );
    }

    if (decision === "pass") {
      await prisma.$transaction([
        prisma.employee.update({
          where: { id: probationRecord.employeeId },
          data: { status: "active" },
        }),
        prisma.probationRecord.update({
          where: { id },
          data: { outcome: "passed", outcomeDate: new Date() },
        }),
      ]);
      return NextResponse.json(
        { updated: true, new_status: "active" },
        { status: 200 },
      );
    }

    if (decision === "extend") {
      if (!extend_months)
        return NextResponse.json(
          { error: "extend_months required" },
          { status: 400 },
        );

      const newEndDate = new Date(probationRecord.probationEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(extend_months, 10));

      await prisma.$transaction([
        prisma.probationExtension.create({
          data: {
            probationRecordId: id,
            extendedByMonths: parseInt(extend_months, 10),
            previousEndDate: probationRecord.probationEndDate,
            newEndDate: newEndDate,
            extendedBy: session.id,
          },
        }),
        prisma.probationRecord.update({
          where: { id },
          data: { probationEndDate: newEndDate },
        }),
      ]);
      return NextResponse.json(
        { updated: true, new_end_date: newEndDate.toISOString() },
        { status: 200 },
      );
    }

    if (decision === "terminate") {
      if (!reason)
        return NextResponse.json({ error: "reason required" }, { status: 400 });

      await prisma.$transaction([
        prisma.employee.update({
          where: { id: probationRecord.employeeId },
          data: { status: "terminated" },
        }),
        prisma.probationRecord.update({
          where: { id },
          data: {
            outcome: "terminated",
            outcomeDate: new Date(),
            outcomeReason: reason,
          },
        }),
      ]);
      return NextResponse.json(
        { updated: true, new_status: "terminated" },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
