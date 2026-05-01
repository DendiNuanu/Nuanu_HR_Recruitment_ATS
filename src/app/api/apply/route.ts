import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { jobId, firstName, lastName, email, phone, linkedin } = data;

    if (!jobId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify vacancy exists
    const vacancy = await prisma.vacancy.findUnique({ where: { id: jobId } });
    if (!vacancy || vacancy.status !== "published") {
      return NextResponse.json({ error: "Invalid or inactive job position" }, { status: 404 });
    }

    // Upsert User (applicants don't login to the ATS backend)
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: `${firstName} ${lastName}`,
        phone: phone || null,
      },
      create: {
        email,
        password: randomPassword,
        name: `${firstName} ${lastName}`,
        phone: phone || null,
      }
    });

    // Create Application
    const application = await prisma.application.create({
      data: {
        vacancyId: jobId,
        candidateId: user.id,
        source: "Careers Page",
        status: "applied",
        currentStage: "applied",
      }
    });

    return NextResponse.json({ success: true, applicationId: application.id }, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation (user already applied to this job)
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "You have already applied for this position" }, { status: 409 });
    }
    console.error("Application Error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
