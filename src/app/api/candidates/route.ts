/**
 * POST /api/candidates
 *
 * Creates a new candidate (User + CandidateProfile + Application) from the
 * Upload CV modal in the HR dashboard.
 *
 * Body (JSON):
 * {
 *   fullName: string,
 *   email: string,
 *   phone?: string,
 *   vacancyId?: string,
 *   location?: string,
 *   yearsOfExperience?: number,
 *   stage?: string,          // defaults to "applied"
 *   cvUrl?: string,
 *   cvText?: string,
 *   skills?: string[],
 *   summary?: string,
 *   aiMatch?: number,        // defaults to 50
 * }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { delCache } from "@/lib/cache";

export async function POST(request: Request) {
  // Auth guard
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    fullName,
    email,
    phone,
    vacancyId,
    location,
    yearsOfExperience,
    stage = "applied",
    cvUrl,
    cvText,
    skills,
    summary,
    aiMatch = 50,
  } = body as {
    fullName: string;
    email: string;
    phone?: string;
    vacancyId?: string;
    location?: string;
    yearsOfExperience?: number;
    stage?: string;
    cvUrl?: string;
    cvText?: string;
    skills?: string[];
    summary?: string;
    aiMatch?: number;
  };

  // Validate required fields
  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Full name and email are required" },
      { status: 400 },
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  try {
    // ── Upsert User (candidate) ──────────────────────────────────────────────
    const randomPassword = await bcrypt.hash(
      Math.random().toString(36).slice(-10),
      10,
    );

    const user = await prisma.user.upsert({
      where: { email: email.trim().toLowerCase() },
      update: {
        name: fullName.trim(),
        ...(phone ? { phone: phone.trim() } : {}),
      },
      create: {
        email: email.trim().toLowerCase(),
        password: randomPassword,
        name: fullName.trim(),
        ...(phone ? { phone: phone.trim() } : {}),
      },
    });

    // ── Upsert CandidateProfile ──────────────────────────────────────────────
    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(cvUrl ? { resumeUrl: cvUrl } : {}),
        ...(cvText ? { resumeText: cvText } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(yearsOfExperience != null
          ? { experienceYears: Number(yearsOfExperience) }
          : {}),
        ...(skills?.length ? { skills } : {}),
        ...(summary ? { summary: summary.trim() } : {}),
      },
      create: {
        userId: user.id,
        ...(cvUrl ? { resumeUrl: cvUrl } : {}),
        ...(cvText ? { resumeText: cvText } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(yearsOfExperience != null
          ? { experienceYears: Number(yearsOfExperience) }
          : {}),
        ...(skills?.length ? { skills } : {}),
        ...(summary ? { summary: summary.trim() } : {}),
      },
    });

    // ── Resolve vacancy ──────────────────────────────────────────────────────
    // If no vacancyId provided, find the first published vacancy as a fallback
    let resolvedVacancyId = vacancyId;
    if (!resolvedVacancyId) {
      const fallback = await prisma.vacancy.findFirst({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      resolvedVacancyId = fallback?.id;
    }

    if (!resolvedVacancyId) {
      return NextResponse.json(
        {
          error:
            "No vacancy selected and no published vacancies found. Please select a job role.",
        },
        { status: 400 },
      );
    }

    // ── Check for duplicate application ─────────────────────────────────────
    const existing = await prisma.application.findFirst({
      where: { candidateId: user.id, vacancyId: resolvedVacancyId },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "This candidate has already applied for the selected position.",
        },
        { status: 409 },
      );
    }

    // ── Create Application ───────────────────────────────────────────────────
    const normalizedStage = (stage as string).toLowerCase().replace(" ", "_");

    const application = await prisma.application.create({
      data: {
        vacancyId: resolvedVacancyId,
        candidateId: user.id,
        source: "HR Upload",
        status: normalizedStage === "rejected" ? "rejected" : "active",
        currentStage: normalizedStage,
      },
      include: {
        candidate: true,
        vacancy: true,
      },
    });

    // ── Create CandidateScore with aiMatch ───────────────────────────────────
    await prisma.candidateScore.create({
      data: {
        applicationId: application.id,
        overallScore: Number(aiMatch) || 50,
      },
    });

    // ── Store CV as Document record ──────────────────────────────────────────
    if (cvUrl) {
      await prisma.document.create({
        data: {
          applicationId: application.id,
          name: `CV - ${fullName.trim()}`,
          type: "resume",
          fileUrl: cvUrl,
          mimeType: "application/pdf",
        },
      });
    }

    // ── Invalidate caches ────────────────────────────────────────────────────
    await delCache("dashboard_metrics");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");

    return NextResponse.json(
      {
        success: true,
        applicationId: application.id,
        candidateName: user.name,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This candidate has already applied for this position." },
        { status: 409 },
      );
    }

    console.error("Create candidate error:", error);
    return NextResponse.json(
      { error: "Failed to create candidate. Please try again." },
      { status: 500 },
    );
  }
}
