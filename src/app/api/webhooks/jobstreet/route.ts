import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const JOBSTREET_WEBHOOK_SECRET = process.env.JOBSTREET_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${JOBSTREET_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
    }

    const payload = await request.json();
    
    if (!payload.application || !payload.jobReferenceId) {
      return NextResponse.json({ error: "Invalid SEEK/JobStreet payload structure" }, { status: 400 });
    }

    const applicant = payload.application;

    // Create user for the candidate
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const user = await prisma.user.upsert({
      where: { email: applicant.email },
      update: { name: `${applicant.firstName} ${applicant.lastName}` },
      create: {
        email: applicant.email,
        password: randomPassword,
        name: `${applicant.firstName} ${applicant.lastName}`,
        phone: applicant.phoneNumber || null,
      },
    });

    // Create application
    const application = await prisma.application.create({
      data: {
        vacancyId: payload.jobReferenceId,
        candidateId: user.id,
        source: "JobStreet",
        status: "applied",
        currentStage: "applied",
      },
    });

    return NextResponse.json({ 
      success: true, 
      applicationId: application.id,
      message: "Candidate successfully ingested from JobStreet" 
    }, { status: 201 });

  } catch (error) {
    console.error("JobStreet Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error processing webhook" }, { status: 500 });
  }
}
