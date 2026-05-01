import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const LINKEDIN_WEBHOOK_SECRET = process.env.LINKEDIN_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-linkedin-signature");
    if (!signature || signature !== LINKEDIN_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
    }

    const payload = await request.json();
    
    if (!payload.candidate || !payload.jobId) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const { candidate, jobId } = payload;

    // Create user for the candidate
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const user = await prisma.user.upsert({
      where: { email: candidate.email },
      update: { name: `${candidate.firstName} ${candidate.lastName}` },
      create: {
        email: candidate.email,
        password: randomPassword,
        name: `${candidate.firstName} ${candidate.lastName}`,
        phone: candidate.phone || null,
      },
    });

    // Create application
    const application = await prisma.application.create({
      data: {
        vacancyId: jobId,
        candidateId: user.id,
        source: "LinkedIn",
        status: "applied",
        currentStage: "applied",
      },
    });

    return NextResponse.json({ 
      success: true, 
      applicationId: application.id,
      message: "Candidate successfully ingested from LinkedIn" 
    }, { status: 201 });

  } catch (error) {
    console.error("LinkedIn Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error processing webhook" }, { status: 500 });
  }
}
