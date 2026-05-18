import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;

  const interviews = await prisma.interview.findMany({
    where: { applicationId },
    include: {
      feedback: {
        include: { interviewer: { select: { name: true } } },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  const feedbackList = interviews.flatMap((iv) =>
    iv.feedback.map((f) => ({
      id: f.id,
      overallRating: f.overallRating,
      technicalScore: f.technicalScore,
      communicationScore: f.communicationScore,
      cultureFitScore: f.cultureFitScore,
      strengths: f.strengths,
      weaknesses: f.weaknesses,
      recommendation: f.recommendation,
      notes: f.notes,
      submittedAt: f.submittedAt?.toISOString() ?? null,
      interviewerName: f.interviewer.name,
    }))
  );

  return NextResponse.json(feedbackList);
}
