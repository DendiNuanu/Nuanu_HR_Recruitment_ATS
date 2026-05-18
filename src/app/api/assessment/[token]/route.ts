/**
 * GET  /api/assessment/[token]  — fetch assessment data for public page
 * POST /api/assessment/[token]  — submit answers
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const link = await prisma.assessmentLink.findUnique({
    where: { token },
    include: {
      assessment: {
        include: {
          application: {
            include: {
              candidate: { select: { name: true } },
              vacancy: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  if (!link) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (link.completedAt) return NextResponse.json({ error: "already_completed" }, { status: 410 });
  if (new Date() > link.expiresAt) return NextResponse.json({ error: "expired" }, { status: 410 });

  const a = link.assessment;
  return NextResponse.json({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type,
    questions: a.questions,
    duration: null, // minutes — null means untimed
    candidateName: a.application.candidate.name,
    position: a.application.vacancy.title,
    expiresAt: link.expiresAt,
  });
}

export async function POST(req: Request, { params }: Params) {
  const { token } = await params;
  const body = await req.json();
  const { answers } = body;

  const link = await prisma.assessmentLink.findUnique({
    where: { token },
    include: { assessment: true },
  });

  if (!link) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (link.completedAt) return NextResponse.json({ error: "already_completed" }, { status: 410 });
  if (new Date() > link.expiresAt) return NextResponse.json({ error: "expired" }, { status: 410 });

  const assessment = link.assessment;

  // Auto-score: count correct answers if questions have correct_answer field
  let score: number | null = null;
  let maxScore: number | null = null;
  let isPassed: boolean | null = null;

  try {
    const questions = assessment.questions as Array<{
      id: string;
      correct_answer?: string;
      points?: number;
    }> | null;

    if (questions && Array.isArray(questions) && answers) {
      maxScore = questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
      score = questions.reduce((sum, q) => {
        const submitted = answers[q.id];
        const correct = q.correct_answer;
        if (correct !== undefined && submitted === correct) {
          return sum + (q.points ?? 1);
        }
        return sum;
      }, 0);
      const threshold = assessment.passThreshold ?? 70;
      isPassed = maxScore > 0 ? (score / maxScore) * 100 >= threshold : null;
    }
  } catch {
    // Non-fatal — store answers without scoring
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        answers,
        score,
        maxScore,
        isPassed,
        status: "completed",
        completedAt: now,
      },
    }),
    prisma.assessmentLink.update({
      where: { id: link.id },
      data: { completedAt: now },
    }),
  ]);

  return NextResponse.json({ success: true, score, maxScore, isPassed });
}
