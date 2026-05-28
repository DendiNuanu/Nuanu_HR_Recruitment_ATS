import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
type ReviewerType = "HR" | "USER_1" | "USER_2";
type RoleKey = "admin" | "hr_manager" | "hr" | "recruiter";

function normalizeReviewerType(value: unknown): ReviewerType {
  if (value === "USER_1") return "USER_1";
  if (value === "USER_2") return "USER_2";
  return "HR";
}

function hasAnyRole(roles: string[] = [], allowed: RoleKey[]) {
  const set = new Set(
    roles.map((role) => role.toLowerCase().trim().replace(/\s+/g, "_")),
  );
  return allowed.some((role) => set.has(role));
}

function getEditPermission({
  reviewerType,
  sessionUserId,
  sessionRoles,
  assignment,
}: {
  reviewerType: ReviewerType;
  sessionUserId: string;
  sessionRoles: string[];
  assignment: {
    hrReviewerId: string | null;
    user1ReviewerId: string | null;
    user2ReviewerId: string | null;
  };
}) {
  const isHrAdmin = hasAnyRole(sessionRoles, ["admin", "hr_manager", "hr"]);
  if (reviewerType === "HR") {
    return (
      isHrAdmin ||
      (assignment.hrReviewerId !== null && assignment.hrReviewerId === sessionUserId)
    );
  }
  if (reviewerType === "USER_1") {
    return (
      (assignment.user1ReviewerId !== null &&
        assignment.user1ReviewerId === sessionUserId) ||
      isHrAdmin
    );
  }
  return (
    (assignment.user2ReviewerId !== null &&
      assignment.user2ReviewerId === sessionUserId) ||
    isHrAdmin
  );
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      hrReviewerId: true,
      user1ReviewerId: true,
      user2ReviewerId: true,
      hrReviewer: { select: { id: true, name: true } },
      user1Reviewer: { select: { id: true, name: true } },
      user2Reviewer: { select: { id: true, name: true } },
    },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

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

  const isHrViewer = hasAnyRole(session.roles, ["admin", "hr_manager", "hr"]);
  const canViewHR = isHrViewer;
  const canViewUser1 = isHrViewer || session.id === application.user1ReviewerId;
  const canViewUser2 = isHrViewer || session.id === application.user2ReviewerId;
  const canEditHR = isHrViewer;
  const canEditUser1 = session.id === application.user1ReviewerId;
  const canEditUser2 = session.id === application.user2ReviewerId;

  return NextResponse.json({
    hr: canViewHR ? mapPayload(latestByType.HR) : null,
    user1: canViewUser1 ? mapPayload(latestByType.USER_1) : null,
    user2: canViewUser2 ? mapPayload(latestByType.USER_2) : null,
    permissions: {
      canViewHR,
      canViewUser1,
      canViewUser2,
      canEditHR,
      canEditUser1,
      canEditUser2,
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;
  const body = await req.json();
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { hrReviewerId: true, user1ReviewerId: true, user2ReviewerId: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

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
  const canEdit = getEditPermission({
    reviewerType,
    sessionUserId: session.id,
    sessionRoles: session.roles,
    assignment: application,
  });
  if (!canEdit) {
    return NextResponse.json(
      { error: "You are not allowed to edit this section" },
      { status: 403 },
    );
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

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAnyRole(session.roles, ["admin", "hr_manager", "hr", "recruiter"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: applicationId } = await params;
  const body = (await req.json()) as {
    hrReviewerId?: string | null;
    user1ReviewerId?: string | null;
    user2ReviewerId?: string | null;
  };

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      hrReviewerId: body.hrReviewerId ?? null,
      user1ReviewerId: body.user1ReviewerId ?? null,
      user2ReviewerId: body.user2ReviewerId ?? null,
    },
    select: {
      id: true,
      hrReviewerId: true,
      user1ReviewerId: true,
      user2ReviewerId: true,
    },
  });

  return NextResponse.json({ success: true, assignments: updated });
}
