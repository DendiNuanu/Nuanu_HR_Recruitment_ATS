import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function isAllowedResumeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const allowedTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ]);
  if (type && allowedTypes.has(type)) return true;
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = formData.get("jobId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const gender = formData.get("gender") as string | null;
    const dateOfBirth = formData.get("dateOfBirth") as string | null;
    const resumeFile = formData.get("resume") as File | null;

    if (!jobId || !firstName || !lastName || !email || !resumeFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!isAllowedResumeFile(resumeFile)) {
      return NextResponse.json(
        { error: "Resume must be PDF, DOCX, JPG, or PNG" },
        { status: 400 },
      );
    }

    if (resumeFile.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { error: "Resume file must be 5MB or less" },
        { status: 400 },
      );
    }

    // ── Verify vacancy exists first ────────────────────────────────────────────
    const vacancy = await prisma.vacancy.findUnique({ where: { id: jobId } });
    if (!vacancy || vacancy.status !== "published") {
      return NextResponse.json(
        { error: "Invalid or inactive job position" },
        { status: 404 },
      );
    }

    // ── Duplicate Detection ────────────────────────────────────────────────────
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      const alreadyApplied = await prisma.application.findFirst({
        where: { candidateId: existingUser.id, vacancyId: jobId },
      });
      if (alreadyApplied) {
        return NextResponse.json(
          { error: "You have already applied for this position" },
          { status: 409 },
        );
      }
    }

    // ── Read file buffer once ──────────────────────────────────────────────────
    const bytes = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Resume Upload (Supabase Storage — optional) ────────────────────────────
    // If Supabase env vars are not configured the upload is skipped gracefully.
    // The application is ALWAYS created; only the file URL may be absent.
    let resumeUrl = "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const safeFilename = `${Date.now()}-${resumeFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const storagePath = `resumes/${safeFilename}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(storagePath, buffer, {
            contentType: resumeFile.type || "application/octet-stream",
            upsert: false,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from("resumes")
            .getPublicUrl(storagePath);
          resumeUrl = data.publicUrl;
        } else {
          console.warn(
            "Supabase Storage upload failed (non-fatal):",
            uploadError.message,
          );
        }
      } catch (storageErr) {
        console.warn("Supabase Storage unavailable (non-fatal):", storageErr);
      }
    } else {
      console.info(
        "Supabase Storage not configured — resume file URL skipped.",
      );
    }

    // ── PDF Text Extraction ────────────────────────────────────────────────────
    let resumeText = "";
    const isPdf =
      resumeFile.type === "application/pdf" ||
      resumeFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(buffer);
        resumeText = parsed.text || "";
      } catch (parseError) {
        console.warn("PDF parsing failed (non-fatal):", parseError);
        resumeText = "";
      }
    }

    // ── Upsert Candidate User ──────────────────────────────────────────────────
    const randomPassword = await bcrypt.hash(
      Math.random().toString(36).slice(-8),
      10,
    );

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
      },
    });

    // ── Upsert CandidateProfile ────────────────────────────────────────────────
    const profileData: {
      resumeUrl?: string;
      resumeText?: string;
      gender?: string;
      dateOfBirth?: Date;
    } = {};
    if (resumeUrl) profileData.resumeUrl = resumeUrl;
    if (resumeText) profileData.resumeText = resumeText;
    if (gender) profileData.gender = gender;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!Number.isNaN(dob.getTime())) profileData.dateOfBirth = dob;
    }

    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });

    // ── Create Application ─────────────────────────────────────────────────────
    const application = await prisma.application.create({
      data: {
        vacancyId: jobId,
        candidateId: user.id,
        source: "Careers Page",
        status: "applied",
        currentStage: "new",
      },
    });

    // ── Background Sync to Google Sheets (non-blocking) ───────────────────────
    Promise.resolve()
      .then(async () => {
        try {
          const { appendCandidateToSheet } =
            await import("@/lib/integrations/google-sheets");
          await appendCandidateToSheet(null, [
            new Date().toISOString(),
            vacancy.title,
            `${firstName} ${lastName}`,
            email,
            phone || "-",
            `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/candidates`,
            "new",
          ]);
        } catch {
          // Non-fatal — sheet sync failure must never break submissions
        }
      })
      .catch(() => {});

    return NextResponse.json(
      { success: true, applicationId: application.id },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Unique constraint — candidate already applied to this vacancy
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You have already applied for this position" },
        { status: 409 },
      );
    }

    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 },
    );
  }
}
