import { NextResponse } from "next/server";
import { rejectRequisition } from "@/lib/requisitionService";

export async function POST(req: Request) {
  try {
    const { requisitionId, approverId, comment } = await req.json();

    if (!requisitionId || !approverId || !comment) {
      return NextResponse.json({ error: "Missing required fields (comment is required for rejection)" }, { status: 400 });
    }

    const result = await rejectRequisition(requisitionId, approverId, comment);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error (Requisition Reject):", error);
    return NextResponse.json({ error: error.message || "Failed to reject requisition" }, { status: 500 });
  }
}
