/**
 * GET /api/interview-result/[slug]
 * Public, read-only endpoint. No auth required — used by the public
 * /interview-result/[slug] page to render the candidate's interview
 * assessment. Returns only safe-to-share fields.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

type PublicFeedbackSection = {
  reviewerType: "HR" | "USER_1" | "USER_2";
  reviewerLabel: string;
  reviewerName: string | null;
  rating: number | null;
  recommendation: string | null;
  comments: string;
  authorName: string;
  updatedAt: string;
} | null;

const REVIEWER_TYPE_TO_LABEL: Record<string, string> = {
  HR: "HR Manager",
  USER_1: "User 1",
  USER_2: "User 2",
};

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string" || slug.length > 80) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const candidate = await prisma.user.findUnique({
    where: { interviewSlug: slug },
    select: {
      id: true,
      name: true,
      interviewSlug: true,
      applications: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          currentStage: true,
          status: true,
          vacancy: { select: { title: true, location: true } },
          hrReviewer: { select: { name: true } },
          user1Reviewer: { select: { name: true } },
          user2Reviewer: { select: { name: true } },
        },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Interview result not found" },
      { status: 404 },
    );
  }

  const application = candidate.applications[0] ?? null;

  // Public pages only render if the candidate has at least one application
  // in the pipeline. A user with `interviewSlug` but no application would be
  // a partial-import artefact; treat it as 404.
  if (!application) {
    return NextResponse.json(
      { error: "Interview result not available" },
      { status: 404 },
    );
  }

  // Pull the latest comment per reviewer type via the same raw query the
  // private feedback endpoint uses. The columns are stable and the
  // `interview_comments` table is the canonical source.
  type Row = {
    id: string;
    reviewer_type: string;
    rating: number | null;
    recommendation: string | null;
    content: string;
    updatedAt: Date;
    authorId: string;
    authorName: string;
  };

  let rows: Row[] = [];
  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT
        ic."id",
        ic."reviewer_type",
        ic."rating",
        ic."recommendation",
        ic."content",
        ic."updatedAt",
        ic."authorId",
        u."name" as "authorName"
      FROM "interview_comments" ic
      JOIN "users" u ON u."id" = ic."authorId"
      WHERE ic."applicationId" = ${application.id}
      ORDER BY ic."updatedAt" DESC
    `;
  } catch (error) {
    console.error(
      "[GET /api/interview-result] interview_comments query failed:",
      error,
    );
    rows = [];
  }

  const latestByType: Record<string, Row> = {};
  for (const row of rows) {
    const type =
      row.reviewer_type === "USER_1"
        ? "USER_1"
        : row.reviewer_type === "USER_2"
          ? "USER_2"
          : "HR";
    if (!latestByType[type]) latestByType[type] = row;
  }

  const buildSection = (
    type: "HR" | "USER_1" | "USER_2",
    reviewerName: string | null,
  ): PublicFeedbackSection => {
    const row = latestByType[type];
    if (!row) return null;
    return {
      reviewerType: type,
      reviewerLabel: REVIEWER_TYPE_TO_LABEL[type] ?? type,
      reviewerName,
      rating: row.rating,
      recommendation: row.recommendation,
      comments: row.content,
      authorName: row.authorName,
      updatedAt: row.updatedAt.toISOString(),
    };
  };

  return NextResponse.json({
    slug: candidate.interviewSlug,
    name: candidate.name,
    position: application.vacancy.title,
    vacancyLocation: application.vacancy.location,
    stage: application.currentStage,
    status: application.status,
    assignedReviewers: {
      hr: application.hrReviewer?.name ?? null,
      user1: application.user1Reviewer?.name ?? null,
      user2: application.user2Reviewer?.name ?? null,
    },
    feedback: {
      hr: buildSection("HR", application.hrReviewer?.name ?? null),
      user1: buildSection("USER_1", application.user1Reviewer?.name ?? null),
      user2: buildSection("USER_2", application.user2Reviewer?.name ?? null),
    },
  });
}
