import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { employee_id, evaluation_date, evaluated_by, score, notes, recommendation } = body;

    if (!employee_id || !evaluation_date || !evaluated_by || !score || !recommendation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const probationRecord = await prisma.probationRecord.findUnique({
      where: { employeeId: employee_id }
    });

    if (!probationRecord) {
      return NextResponse.json({ error: "Probation record not found" }, { status: 404 });
    }

    const evaluation = await prisma.probationEvaluation.create({
      data: {
        probationRecordId: probationRecord.id,
        employeeId: employee_id,
        evaluationDate: new Date(evaluation_date),
        evaluatedBy: evaluated_by,
        score,
        notes: notes || "",
        recommendation
      }
    });

    return NextResponse.json({ evaluation_id: evaluation.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
