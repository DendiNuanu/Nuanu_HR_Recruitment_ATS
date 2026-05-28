import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
type ReviewerType = "HR" | "USER_1" | "USER_2";

type FeedbackPermissions = {
  canViewHR: boolean;
  canViewUser1: boolean;
  canViewUser2: boolean;
  canEditHR: boolean;
  canEditUser1: boolean;
  canEditUser2: boolean;
  canAssignReviewers: boolean;
};

type ApplicationAssignment = {
  user1ReviewerId: string | null;
  user2ReviewerId: string | null;
  user1ReviewerName: string | null;
  user2ReviewerName: string | null;
  assignmentsAvailable: boolean;
};

const ASSIGNABLE_REVIEWER_ROLE_SLUGS = [
  "interviewer",
  "manager",
  "recruiter",
  "hr",
  "super-admin",
  "admin",
];

type CommentRow = {
  id: string;
  reviewer_type: ReviewerType;
  rating: number | null;
  recommendation: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
};

/** Normalize role slugs: `super-admin` and `super_admin` both become `super_admin`. */
function normalizeRoleSlug(role: string): string {
  return role.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

const HR_VIEWER_SLUGS = new Set(["admin", "super_admin", "hr_manager", "hr"]);

function isHrViewer(roles: string[] = []): boolean {
  return roles.some((role) => HR_VIEWER_SLUGS.has(normalizeRoleSlug(role)));
}

function computeFeedbackPermissions(
  session: { id: string; roles: string[] },
  assignment: ApplicationAssignment,
): FeedbackPermissions {
  const hr = isHrViewer(session.roles);
  return {
    canViewHR: hr,
    canViewUser1: hr || session.id === assignment.user1ReviewerId,
    canViewUser2: hr || session.id === assignment.user2ReviewerId,
    canEditHR: hr,
    canEditUser1:
      assignment.user1ReviewerId !== null &&
      session.id === assignment.user1ReviewerId,
    canEditUser2:
      assignment.user2ReviewerId !== null &&
      session.id === assignment.user2ReviewerId,
    canAssignReviewers: hr && assignment.assignmentsAvailable,
  };
}

function mapAssignmentsResponse(assignment: ApplicationAssignment) {
  return {
    user1ReviewerId: assignment.user1ReviewerId,
    user2ReviewerId: assignment.user2ReviewerId,
    user1ReviewerName: assignment.user1ReviewerName,
    user2ReviewerName: assignment.user2ReviewerName,
    assignmentsAvailable: assignment.assignmentsAvailable,
  };
}

function normalizeReviewerType(value: unknown): ReviewerType {
  if (value === "USER_1") return "USER_1";
  if (value === "USER_2") return "USER_2";
  return "HR";
}

async function loadAssignment(applicationId: string): Promise<ApplicationAssignment> {
  const fallback: ApplicationAssignment = {
    user1ReviewerId: null,
    user2ReviewerId: null,
    user1ReviewerName: null,
    user2ReviewerName: null,
    assignmentsAvailable: false,
  };
  try {
    const withAssignment = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        user1ReviewerId: true,
        user2ReviewerId: true,
        user1Reviewer: { select: { name: true } },
        user2Reviewer: { select: { name: true } },
      },
    });
    if (!withAssignment) {
      return { ...fallback, assignmentsAvailable: true };
    }
    return {
      user1ReviewerId: withAssignment.user1ReviewerId,
      user2ReviewerId: withAssignment.user2ReviewerId,
      user1ReviewerName: withAssignment.user1Reviewer?.name ?? null,
      user2ReviewerName: withAssignment.user2Reviewer?.name ?? null,
      assignmentsAvailable: true,
    };
  } catch {
    return fallback;
  }
}

async function loadAssignableUsers() {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      userRoles: {
        some: {
          role: {
            slug: { in: ASSIGNABLE_REVIEWER_ROLE_SLUGS },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      userRoles: {
        select: {
          role: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

async function validateReviewerAssignments(
  user1ReviewerId: string | null,
  user2ReviewerId: string | null,
): Promise<string | null> {
  if (user1ReviewerId && user2ReviewerId && user1ReviewerId === user2ReviewerId) {
    return "User 1 and User 2 reviewers must be different people";
  }
  const ids = [user1ReviewerId, user2ReviewerId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (ids.length === 0) return null;
  const count = await prisma.user.count({
    where: { id: { in: ids }, deletedAt: null },
  });
  if (count !== ids.length) {
    return "One or more selected reviewers could not be found";
  }
  return null;
}

async function loadInterviewCommentRows(
  applicationId: string,
): Promise<CommentRow[]> {
  try {
    return await prisma.$queryRaw<CommentRow[]>`
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
  } catch (error) {
    console.warn(
      "interview_comments query with reviewer_type failed, using fallback:",
      error,
    );
    const basic = await prisma.$queryRaw<
      Omit<CommentRow, "reviewer_type" | "rating" | "recommendation">[]
    >`
      SELECT
        ic."id",
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
    return basic.map((row) => ({
      ...row,
      reviewer_type: "HR" as ReviewerType,
      rating: null,
      recommendation: null,
    }));
  }
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const baseApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true },
  });
  if (!baseApplication) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const assignment = await loadAssignment(applicationId);
  let rows: CommentRow[] = [];
  try {
    rows = await loadInterviewCommentRows(applicationId);
  } catch (error) {
    console.error("Failed to load interview comments:", error);
    const permissions = computeFeedbackPermissions(session, assignment);
    const assignableUsers = permissions.canAssignReviewers
      ? (await loadAssignableUsers()).map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          roleLabel:
            user.userRoles.map((ur) => ur.role.name).join(", ") || "Staff",
        }))
      : [];
    return NextResponse.json({
      hr: null,
      user1: null,
      user2: null,
      permissions,
      assignments: mapAssignmentsResponse(assignment),
      assignableUsers,
      warning: "Interview comments could not be loaded from the database.",
    });
  }

  const latestByType: Partial<Record<ReviewerType, CommentRow>> = {};
  for (const row of rows) {
    const type = normalizeReviewerType(row.reviewer_type);
    if (!latestByType[type]) {
      latestByType[type] = { ...row, reviewer_type: type };
    }
  }

  const mapPayload = (item?: CommentRow | null) =>
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

  const permissions = computeFeedbackPermissions(session, assignment);
  const assignableUsers = permissions.canAssignReviewers
    ? (await loadAssignableUsers()).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleLabel: user.userRoles.map((ur) => ur.role.name).join(", ") || "Staff",
      }))
    : [];

  return NextResponse.json({
    hr: permissions.canViewHR ? mapPayload(latestByType.HR) : null,
    user1: permissions.canViewUser1 ? mapPayload(latestByType.USER_1) : null,
    user2: permissions.canViewUser2 ? mapPayload(latestByType.USER_2) : null,
    permissions,
    assignments: mapAssignmentsResponse(assignment),
    assignableUsers,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const body = await req.json();
  const baseApplication = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true },
  });
  if (!baseApplication) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const assignment = await loadAssignment(applicationId);
  const reviewerType = normalizeReviewerType(body.reviewerType);
  const rating = typeof body.rating === "number" ? body.rating : null;
  const recommendation =
    typeof body.recommendation === "string" ? body.recommendation : null;
  const comments = typeof body.comments === "string" ? body.comments.trim() : "";

  if (rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }
  if (!comments) {
    return NextResponse.json({ error: "comments is required" }, { status: 400 });
  }

  const permissions = computeFeedbackPermissions(session, assignment);
  const canEdit =
    reviewerType === "HR"
      ? permissions.canEditHR
      : reviewerType === "USER_1"
        ? permissions.canEditUser1
        : permissions.canEditUser2;

  if (!canEdit) {
    return NextResponse.json(
      { error: "You are not allowed to edit this section" },
      { status: 403 },
    );
  }

  let existing: { id: string }[] = [];
  try {
    existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "interview_comments"
      WHERE "applicationId" = ${applicationId}
        AND "authorId" = ${session.id}
        AND "reviewer_type" = ${reviewerType}
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `;
  } catch {
    existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "interview_comments"
      WHERE "applicationId" = ${applicationId}
        AND "authorId" = ${session.id}
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `;
  }

  const now = new Date();
  let id = existing[0]?.id;

  try {
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
  } catch (error) {
    console.error("Failed to save interview comment:", error);
    if (!id) {
      const inserted = await prisma.interviewComment.create({
        data: {
          applicationId,
          content: comments,
          authorId: session.id,
        },
        select: { id: true },
      });
      id = inserted.id;
    } else {
      await prisma.interviewComment.update({
        where: { id },
        data: { content: comments },
      });
    }
  }

  return NextResponse.json({ success: true, id });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isHrViewer(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: applicationId } = await params;
  const body = (await req.json()) as {
    hrReviewerId?: string | null;
    user1ReviewerId?: string | null;
    user2ReviewerId?: string | null;
  };

  const current = await loadAssignment(applicationId);
  if (!current.assignmentsAvailable) {
    return NextResponse.json(
      { error: "Reviewer assignment columns are not available in this environment" },
      { status: 503 },
    );
  }

  const hasUser1 = Object.prototype.hasOwnProperty.call(body, "user1ReviewerId");
  const hasUser2 = Object.prototype.hasOwnProperty.call(body, "user2ReviewerId");
  const hasHr = Object.prototype.hasOwnProperty.call(body, "hrReviewerId");
  if (!hasUser1 && !hasUser2 && !hasHr) {
    return NextResponse.json(
      { error: "No assignment fields provided" },
      { status: 400 },
    );
  }

  const nextUser1 = hasUser1
    ? body.user1ReviewerId || null
    : current.user1ReviewerId;
  const nextUser2 = hasUser2
    ? body.user2ReviewerId || null
    : current.user2ReviewerId;

  const validationError = await validateReviewerAssignments(nextUser1, nextUser2);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const data: {
    hrReviewerId?: string | null;
    user1ReviewerId?: string | null;
    user2ReviewerId?: string | null;
  } = {};
  if (hasHr) data.hrReviewerId = body.hrReviewerId || null;
  if (hasUser1) data.user1ReviewerId = nextUser1;
  if (hasUser2) data.user2ReviewerId = nextUser2;

  try {
    await prisma.application.update({
      where: { id: applicationId },
      data,
    });
    const assignment = await loadAssignment(applicationId);
    return NextResponse.json({
      success: true,
      assignments: mapAssignmentsResponse(assignment),
    });
  } catch {
    return NextResponse.json(
      { error: "Reviewer assignment columns are not available in this environment" },
      { status: 503 },
    );
  }
}
