/**
 * GET  /api/candidates  — paginated candidate list
 * POST /api/candidates  — create candidate (existing logic preserved)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { delCache } from "@/lib/cache";

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const search = searchParams.get("search") ?? "";
  const stage = searchParams.get("stage") ?? "";
  const source = searchParams.get("source") ?? "";

  const where: Record<string, unknown> = { deletedAt: null };

  if (stage) where.currentStage = stage;
  if (source) where.source = source;

  if (search) {
    where.OR = [
      { candidate: { name: { contains: search, mode: "insensitive" } } },
      { candidate: { email: { contains: search, mode: "insensitive" } } },
      { vacancy: { title: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        candidate: true,
        vacancy: { select: { title: true, location: true } },
        candidateScore: { select: { overallScore: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const candidates = applications.map((app) => ({
    id: app.id,
    candidateId: app.candidateId,
    name: app.candidate.name,
    email: app.candidate.email,
    phone: app.candidate.phone,
    vacancyTitle: app.vacancy.title,
    location: app.vacancy.location ?? "Remote",
    stage: app.currentStage,
    source: app.source,
    score: app.candidateScore?.overallScore ?? 0,
    appliedAt: app.appliedAt.toISOString(),
  }));

  return NextResponse.json({
    candidates,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    fullName, email, phone, vacancyId, location,
    yearsOfExperience, stage = "applied", cvUrl, cvText,
    skills, summary, aiMatch = 50,
  } = body as {
    fullName: string; email: string; phone?: string; vacancyId?: string;
    location?: string; yearsOfExperience?: number; stage?: string;
    cvUrl?: string; cvText?: string; skills?: string[];
    summary?: string; aiMatch?: number;
  };

  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Full name and email are required" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);

    const user = await prisma.user.upsert({
      where: { email: email.trim().toLowerCase() },
      update: { name: fullName.trim(), ...(phone ? { phone: phone.trim() } : {}) },
      create: {
        email: email.trim().toLowerCase(), password: randomPassword,
        name: fullName.trim(), ...(phone ? { phone: phone.trim() } : {}),
      },
    });

    await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(cvUrl ? { resumeUrl: cvUrl } : {}),
        ...(cvText ? { resumeText: cvText } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(yearsOfExperience != null ? { experienceYears: Number(yearsOfExperience) } : {}),
        ...(skills?.length ? { skills } : {}),
        ...(summary ? { summary: summary.trim() } : {}),
      },
      create: {
        userId: user.id,
        ...(cvUrl ? { resumeUrl: cvUrl } : {}),
        ...(cvText ? { resumeText: cvText } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(yearsOfExperience != null ? { experienceYears: Number(yearsOfExperience) } : {}),
        ...(skills?.length ? { skills } : {}),
        ...(summary ? { summary: summary.trim() } : {}),
      },
    });

    let resolvedVacancyId = vacancyId;
    if (!resolvedVacancyId) {
      const fallback = await prisma.vacancy.findFirst({
        where: { status: "published" }, orderBy: { createdAt: "desc" }, select: { id: true },
      });
      resolvedVacancyId = fallback?.id;
    }

    if (!resolvedVacancyId) {
      return NextResponse.json({ error: "No vacancy selected and no published vacancies found." }, { status: 400 });
    }

    const existing = await prisma.application.findFirst({
      where: { candidateId: user.id, vacancyId: resolvedVacancyId },
    });
    if (existing) {
      return NextResponse.json({ error: "This candidate has already applied for the selected position." }, { status: 409 });
    }

    const normalizedStage = (stage as string).toLowerCase().replace(" ", "_");
    const application = await prisma.application.create({
      data: {
        vacancyId: resolvedVacancyId, candidateId: user.id,
        source: "HR Upload",
        status: normalizedStage === "rejected" ? "rejected" : "active",
        currentStage: normalizedStage,
      },
      include: { candidate: true, vacancy: true },
    });

    await prisma.candidateScore.create({
      data: { applicationId: application.id, overallScore: Number(aiMatch) || 50 },
    });

    if (cvUrl) {
      await prisma.document.create({
        data: {
          applicationId: application.id, name: `CV - ${fullName.trim()}`,
          type: "resume", fileUrl: cvUrl, mimeType: "application/pdf",
        },
      });
    }

    await delCache("dashboard_metrics");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true, applicationId: application.id, candidateName: user.name }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "This candidate has already applied for this position." }, { status: 409 });
    }
    console.error("Create candidate error:", error);
    return NextResponse.json({ error: "Failed to create candidate. Please try again." }, { status: 500 });
  }
}
