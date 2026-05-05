import { NextResponse } from "next/server";
import { createRequisition } from "@/lib/requisitionService";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { vacancyId, userId } = await req.json();

    if (!vacancyId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const requisition = await createRequisition(vacancyId, userId);

    return NextResponse.json({ success: true, requisition });
  } catch (error: any) {
    console.error("API Error (Requisition Create):", error);
    return NextResponse.json({ error: error.message || "Failed to create requisition" }, { status: 500 });
  }
}
