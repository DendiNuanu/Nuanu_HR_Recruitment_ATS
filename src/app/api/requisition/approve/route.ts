import { NextResponse } from "next/server";
import { approveStep } from "@/lib/requisitionService";
import { sendTelegramNotification } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const { requisitionId, approverId, comment } = await req.json();

    if (!requisitionId || !approverId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await approveStep(requisitionId, approverId, comment);

    // Fire-and-forget Telegram broadcast (never throws)
    Promise.resolve().then(async () => {
      try {
        const msg = [
          "✅ <b>Requisition Approved</b>",
          "",
          `A job requisition approval step has been completed.`,
          comment ? `💬 Comment: ${comment}` : "",
          "",
          "<i>Nuanu HR Recruitment ATS</i>",
        ]
          .filter(Boolean)
          .join("\n");
        await sendTelegramNotification(msg);
      } catch {
        // Swallow — Telegram must never break approval flow
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error (Requisition Approve):", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve requisition" },
      { status: 500 },
    );
  }
}
