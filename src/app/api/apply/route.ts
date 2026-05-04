import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = formData.get("jobId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const resumeFile = formData.get("resume") as File | null;

    if (!jobId || !firstName || !lastName || !email || !resumeFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify vacancy exists
    const vacancy = await prisma.vacancy.findUnique({ where: { id: jobId } });
    if (!vacancy || vacancy.status !== "published") {
      return NextResponse.json({ error: "Invalid or inactive job position" }, { status: 404 });
    }

    // Handle resume upload
    const bytes = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public/uploads/resumes");
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const safeFilename = `${Date.now()}-${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeFilename);
    await fs.writeFile(filePath, buffer);

    const resumeUrl = `/uploads/resumes/${safeFilename}`;

    // Extract text using pdf-parse if it's a PDF
    let resumeText = "";
    if (resumeFile.type === "application/pdf" || resumeFile.name.toLowerCase().endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse");
        const parsed = await pdfParse(buffer);
        resumeText = parsed.text;
      } catch (parseError) {
        console.error("PDF Parsing Error:", parseError);
        resumeText = "Could not extract text from PDF.";
      }
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

    // Upsert CandidateProfile
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        resumeUrl,
        resumeText,
      },
      create: {
        userId: user.id,
        resumeUrl,
        resumeText,
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

    // 4. Background Sync to Google Sheets
    // We do this in a non-blocking way to ensure candidate UX is fast
    try {
      const { appendCandidateToSheet } = require("@/lib/integrations/google-sheets");
      const candidateData = [
        new Date().toISOString(),
        vacancy.title,
        `${firstName} ${lastName}`,
        email,
        phone || "-",
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/candidates`, // Link to ATS profile
        "applied"
      ];
      
      // Attempt sync (it will check both Env and DB settings internally)
      await appendCandidateToSheet(null, candidateData);
    } catch (sheetError) {
      console.error("Google Sheets Sync Failed:", sheetError);
      // We don't fail the request if sync fails
    }

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
