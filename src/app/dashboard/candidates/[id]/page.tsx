import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CandidateFullProfile from "./CandidateFullProfile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    select: { candidate: { select: { name: true } } },
  });

  return {
    title: application
      ? `${application.candidate.name} - Nuanu HR Recruitment ATS`
      : "Candidate Not Found",
  };
}

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const fromPage = pickString(resolvedSearchParams.fromPage) ?? "1";

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: {
        include: {
          activityLogs: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          candidateNotes: {
            include: {
              author: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      vacancy: {
        include: {
          department: { select: { name: true } },
        },
      },
      candidateScore: true,
      assessments: {
        orderBy: { createdAt: "desc" },
      },
      referenceChecks: {
        orderBy: { referenceNo: "asc" },
        include: {
          conductor: { select: { id: true, name: true } },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      notes: {
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      interviewComments: {
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!application) {
    notFound();
  }

  // Fetch the CandidateProfile separately (it's keyed by userId, not applicationId)
  const candidateProfile = await prisma.candidateProfile.findUnique({
    where: { userId: application.candidateId },
  });

  return (
    <CandidateFullProfile
      application={JSON.parse(JSON.stringify(application))}
      candidateProfile={candidateProfile ? JSON.parse(JSON.stringify(candidateProfile)) : null}
      fromPage={fromPage}
    />
  );
}