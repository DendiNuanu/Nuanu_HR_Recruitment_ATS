import { prisma } from "@/lib/prisma";
import InterviewsClient, { InterviewData } from "./InterviewsClient";

export default async function InterviewsPage() {
  const interviewsDb = await prisma.interview.findMany({
    include: {
      application: {
        include: {
          candidate: true,
          vacancy: true,
        }
      },
      interviewer: true,
    },
    orderBy: {
      scheduledAt: "asc"
    }
  });

  const interviews: InterviewData[] = interviewsDb.map(i => ({
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
    calendarSynced: i.calendarSynced
  }));

  const applicationsDb = await prisma.application.findMany({
    where: { status: { notIn: ["rejected", "hired"] } },
    include: { candidate: true, vacancy: true },
    orderBy: { createdAt: "desc" }
  });

  const activeApplications = applicationsDb.map(app => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title
  }));

  return <InterviewsClient interviews={interviews} activeApplications={activeApplications} />;
}
