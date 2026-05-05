import { NextResponse } from "next/server";
import { approveStep } from "@/lib/requisitionService";

export async function POST(req: Request) {
  try {
    const { requisitionId, approverId, comment } = await req.json();

    if (!requisitionId || !approverId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await approveStep(requisitionId, approverId, comment);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error (Requisition Approve):", error);
    return NextResponse.json({ error: error.message || "Failed to approve requisition" }, { status: 500 });
  }
}
