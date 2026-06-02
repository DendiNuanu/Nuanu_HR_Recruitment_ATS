import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INTERNAL_ROLE_SLUGS = new Set([
  "admin",
  "super-admin",
  "super_admin",
  "hr",
  "hr_manager",
  "recruiter",
  "manager",
  "hiring_manager",
  "interviewer",
]);

type Params = { params: Promise<{ id: string }> };

type ReferencePayload = {
  referenceNo: number;
  agencyName?: string | null;
  telephone?: string | null;
  cityState?: string | null;
  jobTitle?: string | null;
  employmentFrom?: string | null;
  employmentTo?: string | null;
  reasonForLeaving?: string | null;
  eligibleForRehire?: string | null;
  rehireRemarks?: string | null;
  personProvidingInfo?: string | null;
  personTitle?: string | null;
  workPerformance?: string | null;
  strengths?: string | null;
  areasToImprove?: string | null;
  additionalNotes?: string | null;
  overallRating?: number | null;
  recommendation?: string | null;
};

function hasManageAccess(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase());
  return normalized.some((role) =>
    [
      "admin",
      "super-admin",
      "super_admin",
      "hr_manager",
      "hr",
      "recruiter",
    ].includes(role),
  );
}

function sanitizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function loadShareableUsers() {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      userRoles: { some: {} },
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

  return users
    .filter((user) =>
      user.userRoles.some((item) =>
        INTERNAL_ROLE_SLUGS.has(item.role.slug.toLowerCase()),
      ),
    )
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roleLabel:
        user.userRoles.map((item) => item.role.name).join(", ") || "User",
    }));
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasManageAccess(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: candidateId } = await params;

  const [referenceChecks, shareableUsers, share] = await Promise.all([
    prisma.referenceCheck.findMany({
      where: { candidateId },
      orderBy: { referenceNo: "asc" },
      include: {
        conductor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    loadShareableUsers(),
    prisma.referenceCheckShare.findUnique({
      where: { applicationId: candidateId },
      include: {
        sharedWith: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    referenceChecks,
    shareableUsers,
    sharedStatus: share
      ? {
          sharedAt: share.sharedAt.toISOString(),
          sharedWith: share.sharedWith,
        }
      : null,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasManageAccess(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: candidateId } = await params;
  const body = (await req.json()) as ReferencePayload;
  const referenceNo = Number(body.referenceNo);

  if (!Number.isInteger(referenceNo) || referenceNo < 1 || referenceNo > 5) {
    return NextResponse.json(
      { error: "referenceNo must be between 1 and 5" },
      { status: 400 },
    );
  }

  const referenceCheck = await prisma.referenceCheck.upsert({
    where: {
      candidateId_referenceNo: {
        candidateId,
        referenceNo,
      },
    },
    update: {
      agencyName: sanitizeText(body.agencyName),
      telephone: sanitizeText(body.telephone),
      cityState: sanitizeText(body.cityState),
      jobTitle: sanitizeText(body.jobTitle),
      employmentFrom: sanitizeText(body.employmentFrom),
      employmentTo: sanitizeText(body.employmentTo),
      reasonForLeaving: sanitizeText(body.reasonForLeaving),
      eligibleForRehire: sanitizeText(body.eligibleForRehire),
      rehireRemarks: sanitizeText(body.rehireRemarks),
      personProvidingInfo: sanitizeText(body.personProvidingInfo),
      personTitle: sanitizeText(body.personTitle),
      workPerformance: sanitizeText(body.workPerformance),
      strengths: sanitizeText(body.strengths),
      areasToImprove: sanitizeText(body.areasToImprove),
      additionalNotes: sanitizeText(body.additionalNotes),
      overallRating:
        typeof body.overallRating === "number" ? body.overallRating : null,
      recommendation: sanitizeText(body.recommendation),
      conductedBy: session.id,
      conductedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      candidateId,
      referenceNo,
      agencyName: sanitizeText(body.agencyName),
      telephone: sanitizeText(body.telephone),
      cityState: sanitizeText(body.cityState),
      jobTitle: sanitizeText(body.jobTitle),
      employmentFrom: sanitizeText(body.employmentFrom),
      employmentTo: sanitizeText(body.employmentTo),
      reasonForLeaving: sanitizeText(body.reasonForLeaving),
      eligibleForRehire: sanitizeText(body.eligibleForRehire),
      rehireRemarks: sanitizeText(body.rehireRemarks),
      personProvidingInfo: sanitizeText(body.personProvidingInfo),
      personTitle: sanitizeText(body.personTitle),
      workPerformance: sanitizeText(body.workPerformance),
      strengths: sanitizeText(body.strengths),
      areasToImprove: sanitizeText(body.areasToImprove),
      additionalNotes: sanitizeText(body.additionalNotes),
      overallRating:
        typeof body.overallRating === "number" ? body.overallRating : null,
      recommendation: sanitizeText(body.recommendation),
      conductedBy: session.id,
      conductedAt: new Date(),
    },
    include: {
      conductor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ referenceCheck });
}
