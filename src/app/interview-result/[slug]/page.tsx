import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PublicInterviewResultView, {
  type PublicInterviewResultData,
  type PublicInterviewPermissions,
  type PublicSessionInfo,
} from "./PublicInterviewResultView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HR_ROLE_SLUGS = new Set(["admin", "super_admin", "hr_manager", "hr"]);

function isHrViewer(roles: string[] = []): boolean {
  return roles.some((role) => HR_ROLE_SLUGS.has(role.toLowerCase().trim()));
}

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

async function loadPublicInterviewResult(
  slug: string,
): Promise<PublicInterviewResultData | null> {
  const candidate = await prisma.user.findUnique({
    where: { interviewSlug: slug },
    select: {
      id: true,
      name: true,
      applications: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          currentStage: true,
          status: true,
          vacancy: { select: { title: true, location: true } },
          hrReviewerId: true,
          user1ReviewerId: true,
          user2ReviewerId: true,
          hrReviewer: { select: { name: true } },
          user1Reviewer: { select: { name: true } },
          user2Reviewer: { select: { name: true } },
        },
      },
    },
  });
  if (!candidate) return null;
  const application = candidate.applications[0];
  if (!application) return null;

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
  } catch {
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
      reviewerLabel:
        type === "HR" ? "HR Manager" : type === "USER_1" ? "User 1" : "User 2",
      reviewerName,
      rating: row.rating,
      recommendation: row.recommendation,
      comments: row.content,
      authorName: row.authorName,
      updatedAt: row.updatedAt.toISOString(),
    };
  };

  return {
    applicationId: application.id,
    candidate: { id: candidate.id, name: candidate.name },
    application: {
      position: application.vacancy.title,
      location: application.vacancy.location,
      stage: application.currentStage,
      status: application.status,
    },
    assignedReviewers: {
      hr: application.hrReviewer?.name ?? null,
      user1: application.user1Reviewer?.name ?? null,
      user2: application.user2Reviewer?.name ?? null,
    },
    reviewerIds: {
      hr: application.hrReviewerId ?? null,
      user1: application.user1ReviewerId ?? null,
      user2: application.user2ReviewerId ?? null,
    },
    feedback: {
      hr: buildSection("HR", application.hrReviewer?.name ?? null),
      user1: buildSection("USER_1", application.user1Reviewer?.name ?? null),
      user2: buildSection("USER_2", application.user2Reviewer?.name ?? null),
    },
  };
}

export default async function PublicInterviewResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length > 80) notFound();

  // Require login: this page is for assigned reviewers (HR, User 1, User 2)
  // and HR/Admin staff to fill in or review interview feedback. Redirect
  // unauthenticated visitors to the login page, then bring them back here.
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/interview-result/${slug}`)}`);
  }

  const data = await loadPublicInterviewResult(slug);
  if (!data) notFound();

  const isHr = isHrViewer(session.roles);
  const isHrReviewer =
    data.reviewerIds.hr !== null && data.reviewerIds.hr === session.id;
  const isUser1Reviewer =
    data.reviewerIds.user1 !== null && data.reviewerIds.user1 === session.id;
  const isUser2Reviewer =
    data.reviewerIds.user2 !== null && data.reviewerIds.user2 === session.id;

  const sessionInfo: PublicSessionInfo = {
    id: session.id,
    name: session.name,
    email: session.email,
    isHr,
    isAssignedReviewer: isHrReviewer || isUser1Reviewer || isUser2Reviewer,
  };

  // HR/Admin can always view and edit every section. The assigned
  // reviewer can view and edit ONLY their own section. Everyone else
  // sees nothing (we don't expose other reviewers' feedback to peers).
  const permissions: PublicInterviewPermissions = {
    canViewHr: isHr,
    canViewUser1: isHr || isUser1Reviewer,
    canViewUser2: isHr || isUser2Reviewer,
    canEditHr: isHr || isHrReviewer,
    canEditUser1: isHr || isUser1Reviewer,
    canEditUser2: isHr || isUser2Reviewer,
  };

  // Server-side enforcement: strip out the feedback content for any
  // section the current user is not allowed to view, so it never reaches
  // the browser payload in the first place. (The client also hides those
  // sections, but defense-in-depth: never trust the client to enforce
  // access control.)
  const safeData: PublicInterviewResultData = {
    ...data,
    feedback: {
      hr: permissions.canViewHr ? data.feedback.hr : null,
      user1: permissions.canViewUser1 ? data.feedback.user1 : null,
      user2: permissions.canViewUser2 ? data.feedback.user2 : null,
    },
  };

  return (
    <PublicInterviewResultView
      data={safeData}
      session={sessionInfo}
      permissions={permissions}
    />
  );
}
