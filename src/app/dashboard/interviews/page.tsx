import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import InterviewsClient, { InterviewData } from "./InterviewsClient";

const getCachedInterviewsData = unstable_cache(
  async () => {
    const interviewsDb = await prisma.interview.findMany({
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
        interviewer: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    const interviews: InterviewData[] = interviewsDb.map((i) => ({
      id: i.id,
      candidateName: i.application.candidate.name,
      position: i.application.vacancy.title,
      stage: i.stage,
      scheduledAt: i.scheduledAt,
      type: i.type,
      location: i.location || "Remote",
      status: i.status,
      interviewerName: i.interviewer.name,
      meetingUrl: i.meetingUrl || undefined,
      meetingLink: i.meetingLink || undefined,
      calendarSynced: i.calendarSynced,
    }));

    const applicationsDb = await prisma.application.findMany({
      where: { status: { notIn: ["rejected", "hired"] } },
      include: { candidate: true, vacancy: true },
      orderBy: { createdAt: "desc" },
    });

    const activeApplications = applicationsDb.map((app) => ({
      id: app.id,
      candidateName: app.candidate.name,
      vacancyTitle: app.vacancy.title,
    }));

    return { interviews, activeApplications };
  },
  ["interviews-page-data"],
  { revalidate: 60, tags: ["interviews", "applications"] },
);

export default async function InterviewsPage() {
  const { interviews, activeApplications } = await getCachedInterviewsData();

  return (
    <InterviewsClient
      interviews={interviews}
      activeApplications={activeApplications}
    />
  );
}
