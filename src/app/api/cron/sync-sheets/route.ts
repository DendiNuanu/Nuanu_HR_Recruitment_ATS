import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendCandidateToSheet } from "@/lib/integrations/google-sheets";

const CRON_SECRET = process.env.CRON_SECRET;
const TRACKING_SPREADSHEET_ID = process.env.TRACKING_SPREADSHEET_ID;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!TRACKING_SPREADSHEET_ID) {
      return NextResponse.json({ error: "Google Sheets Tracking ID not configured" }, { status: 400 });
    }

    // Fetch recent applications with related data
    const recentApplications = await prisma.application.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        candidate: true,
        vacancy: true,
        candidateScore: true,
      }
    });

    if (recentApplications.length === 0) {
      return NextResponse.json({ message: "No new candidates to sync" }, { status: 200 });
    }

    for (const app of recentApplications) {
      const rowData = [
        app.id,
        app.candidate.name,
        app.candidate.email,
        app.candidate.phone || "N/A",
        app.vacancy.title,
        app.source || "Direct",
        app.status,
        app.candidateScore?.overallScore?.toString() || "0",
        app.createdAt.toISOString().split("T")[0],
      ];

      await appendCandidateToSheet(TRACKING_SPREADSHEET_ID, rowData);
    }

    return NextResponse.json({ 
      success: true, 
      syncedCount: recentApplications.length,
      message: "Sync completed successfully" 
    });

  } catch (error) {
    console.error("Cron Sync Error:", error);
    return NextResponse.json({ error: "Failed to sync to Google Sheets" }, { status: 500 });
  }
}
