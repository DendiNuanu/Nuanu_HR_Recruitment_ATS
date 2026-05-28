import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
type ReviewerType = "HR" | "USER_1" | "USER_2";

function normalizeReviewerType(value: unknown): ReviewerType {
  if (value === "USER_1") return "USER_1";
  if (value === "USER_2") return "USER_2";
  return "HR";
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;
  const rows = await prisma.$queryRaw<
    {
      id: string;
      reviewer_type: ReviewerType;
      rating: number | null;
      recommendation: string | null;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      authorId: string;
      authorName: string;
    }[]
  >`
    SELECT
      ic."id",
      ic."reviewer_type",
      ic."rating",
      ic."recommendation",
      ic."content",
      ic."createdAt",
      ic."updatedAt",
      ic."authorId",
      u."name" as "authorName"
    FROM "interview_comments" ic
    JOIN "users" u ON u."id" = ic."authorId"
    WHERE ic."applicationId" = ${applicationId}
    ORDER BY ic."updatedAt" DESC
  `;

  const latestByType: Partial<Record<ReviewerType, (typeof rows)[number]>> = {};
  for (const row of rows) {
    if (!latestByType[row.reviewer_type]) {
      latestByType[row.reviewer_type] = row;
    }
  }

  const mapPayload = (item?: (typeof rows)[number] | null) =>
    item
      ? {
          id: item.id,
          reviewerType: item.reviewer_type,
          rating: item.rating,
          recommendation: item.recommendation,
          comments: item.content,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          authorId: item.authorId,
          authorName: item.authorName,
        }
      : null;

  return NextResponse.json({
    hr: mapPayload(latestByType.HR),
    user1: mapPayload(latestByType.USER_1),
    user2: mapPayload(latestByType.USER_2),
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;
  const body = await req.json();

  const reviewerType = normalizeReviewerType(body.reviewerType);
  const rating = typeof body.rating === "number" ? body.rating : null;
  const recommendation = typeof body.recommendation === "string" ? body.recommendation : null;
  const comments = typeof body.comments === "string" ? body.comments.trim() : "";

  if (rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }
  if (!comments) {
    return NextResponse.json({ error: "comments is required" }, { status: 400 });
  }

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "interview_comments"
    WHERE "applicationId" = ${applicationId}
      AND "authorId" = ${session.id}
      AND "reviewer_type" = ${reviewerType}
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;

  const now = new Date();
  let id = existing[0]?.id;

  if (id) {
    await prisma.$executeRaw`
      UPDATE "interview_comments"
      SET
        "content" = ${comments},
        "rating" = ${rating},
        "recommendation" = ${recommendation},
        "updatedAt" = ${now}
      WHERE "id" = ${id}
    `;
  } else {
    const inserted = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "interview_comments" (
        "id", "applicationId", "content", "authorId", "reviewer_type", "rating", "recommendation", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${applicationId}, ${comments}, ${session.id}, ${reviewerType}, ${rating}, ${recommendation}, ${now}, ${now}
      )
      RETURNING "id"
    `;
    id = inserted[0].id;
  }

  return NextResponse.json({ success: true, id });
}
