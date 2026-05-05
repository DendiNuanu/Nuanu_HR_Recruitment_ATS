"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/email";
import { checkRole } from "@/lib/rbac";

export async function scheduleInterview(data: {
  applicationId: string;
  type: string;
  scheduledAt: string;
  location: string;
  meetingUrl?: string;
  syncWithGoogle?: boolean;
}) {
  try {
    await checkRole(["admin", "hr", "recruiter"]);

    const adminUser = await prisma.user.findFirst({
      where: { 
        userRoles: { 
          some: { 
            role: { 
              slug: { in: ["super-admin", "admin", "recruiter", "hr"] } 
            } 
          } 
        } 
      }
    });

    if (!adminUser) throw new Error("No authorized personnel found to assign interview");

    // Conflict Detection
    const existingInterview = await prisma.interview.findFirst({
      where: {
        interviewerId: adminUser.id,
        status: "scheduled",
        scheduledAt: {
          gte: new Date(new Date(data.scheduledAt).getTime() - 45 * 60 * 1000), // 45 mins before
          lte: new Date(new Date(data.scheduledAt).getTime() + 45 * 60 * 1000), // 45 mins after
        }
      }
    });

    if (existingInterview) {
      return { success: false, error: "Interviewer is already booked within this time slot (45-min buffer)" };
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        interviewerId: adminUser.id,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        location: data.location,
        meetingUrl: data.meetingUrl || null,
        status: "scheduled",
        stage: data.type === "video" ? "hr_interview" : "tech_interview"
      },
      include: {
        application: { include: { candidate: true } }
      }
    });

    // --- Google Calendar Sync ---
    let googleEvent = null;
    const integration = await prisma.calendarIntegration.findUnique({
      where: { userId: adminUser.id }
    });

    if (integration && data.syncWithGoogle !== false) {
      googleEvent = await createCalendarEvent(adminUser.id, {
        title: `Interview: ${interview.application.candidate.name} - ${interview.type}`,
        description: `Interview for application ${interview.applicationId}. \nLocation: ${data.location}`,
        startTime: new Date(data.scheduledAt),
        endTime: new Date(new Date(data.scheduledAt).getTime() + 60 * 60 * 1000), // Default 1 hour
        attendees: [interview.application.candidate.email, adminUser.email]
      });

      if (googleEvent) {
        await prisma.interview.update({
          where: { id: interview.id },
          data: {
            googleEventId: googleEvent.googleEventId,
            meetingLink: googleEvent.meetingLink,
            calendarSynced: true,
            meetingUrl: googleEvent.meetingLink || interview.meetingUrl
          }
        });
      }
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: interview.application.candidateId,
        action: `Scheduled an interview: ${interview.type}`,
        resource: "Interview",
        resourceId: interview.id,
      }
    });

    // Send Email Notification
    await sendEmail({
      to: interview.application.candidate.email,
      subject: `Interview Scheduled: ${interview.application.candidate.name}`,
      text: `Hi ${interview.application.candidate.name},\n\nYour interview has been scheduled.\n\nDate: ${new Date(data.scheduledAt).toLocaleString()}\nType: ${data.type}\nLocation: ${data.location}${googleEvent?.meetingLink ? `\nMeeting Link: ${googleEvent.meetingLink}` : ""}\n\nBest regards,\nNuanu Recruitment Team`,
    });

    // Update Application Stage
    await prisma.application.update({
      where: { id: data.applicationId },
      data: {
        currentStage: data.type === "video" ? "hr_interview" : "tech_interview"
      }
    });

    // Log Activity
    const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
    if (app) {
      await prisma.activityLog.create({
        data: {
          userId: app.candidateId,
          action: "Scheduled an interview",
          resource: "Interview",
          resourceId: data.applicationId,
        }
      });
    }

    revalidatePath("/dashboard/interviews");
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("Schedule Interview Error:", error);
    return { success: false, error: "Failed to schedule interview" };
  }
}

export async function submitInterviewFeedback(data: {
  interviewId: string;
  overallRating: number;
  technicalScore?: number;
  communicationScore?: number;
  cultureFitScore?: number;
  leadershipScore?: number;
  strengths?: string;
  weaknesses?: string;
  recommendation: string;
  notes?: string;
}) {
  try {
    await checkRole(["admin", "hr", "recruiter", "interviewer"]);

    const interview = await prisma.interview.findUnique({
      where: { id: data.interviewId },
      include: { application: true }
    });

    if (!interview) throw new Error("Interview not found");

    await prisma.interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId: data.interviewId,
          interviewerId: interview.interviewerId,
        }
      },
      update: {
        overallRating: data.overallRating,
        technicalScore: data.technicalScore,
        communicationScore: data.communicationScore,
        cultureFitScore: data.cultureFitScore,
        leadershipScore: data.leadershipScore,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        recommendation: data.recommendation,
        notes: data.notes,
        isSubmitted: true,
        submittedAt: new Date(),
      },
      create: {
        interviewId: data.interviewId,
        interviewerId: interview.interviewerId,
        overallRating: data.overallRating,
        technicalScore: data.technicalScore,
        communicationScore: data.communicationScore,
        cultureFitScore: data.cultureFitScore,
        leadershipScore: data.leadershipScore,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        recommendation: data.recommendation,
        notes: data.notes,
        isSubmitted: true,
        submittedAt: new Date(),
      }
    });

    // Update Interview Status
    await prisma.interview.update({
      where: { id: data.interviewId },
      data: { status: "completed", completedAt: new Date() }
    });

    revalidatePath("/dashboard/interviews");
    return { success: true };
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    return { success: false, error: "Failed to submit feedback" };
  }
}

export async function rescheduleInterview(data: {
  interviewId: string;
  scheduledAt: string;
  location?: string;
  meetingUrl?: string;
}) {
  try {
    await checkRole(["admin", "hr", "recruiter"]);

    const targetInterview = await prisma.interview.findUnique({ where: { id: data.interviewId } });
    
    // Conflict Detection for reschedule
    const existing = await prisma.interview.findFirst({
      where: {
        id: { not: data.interviewId },
        interviewerId: targetInterview?.interviewerId,
        status: "scheduled",
        scheduledAt: {
          gte: new Date(new Date(data.scheduledAt).getTime() - 45 * 60 * 1000),
          lte: new Date(new Date(data.scheduledAt).getTime() + 45 * 60 * 1000),
        }
      }
    });

    if (existing) {
      return { success: false, error: "Interviewer is already booked at this time" };
    }

    const interview = await prisma.interview.update({
      where: { id: data.interviewId },
      data: {
        scheduledAt: new Date(data.scheduledAt),
        location: data.location,
        meetingUrl: data.meetingUrl,
        status: "scheduled"
      },
      include: { application: true }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: interview.application.candidateId,
        action: `Rescheduled interview to ${new Date(data.scheduledAt).toLocaleString()}`,
        resource: "Interview",
        resourceId: interview.id,
      }
    });

    // Sync Update to Google
    if (interview.googleEventId && interview.calendarSynced) {
      await updateCalendarEvent(interview.interviewerId, interview.googleEventId, {
        startTime: new Date(data.scheduledAt),
        endTime: new Date(new Date(data.scheduledAt).getTime() + 60 * 60 * 1000),
        location: data.location,
      } as any);
    }

    revalidatePath("/dashboard/interviews");
    return { success: true };
  } catch (error) {
    console.error("Reschedule Interview Error:", error);
    return { success: false, error: "Failed to reschedule interview" };
  }
}

export async function cancelInterview(interviewId: string) {
  try {
    await checkRole(["admin", "hr", "recruiter"]);

    const interview = await prisma.interview.update({
      where: { id: interviewId },
      data: { status: "cancelled", cancelledAt: new Date() },
      include: { application: true }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: interview.application.candidateId,
        action: `Cancelled interview`,
        resource: "Interview",
        resourceId: interview.id,
      }
    });

    // Sync Deletion to Google
    if (interview.googleEventId && interview.calendarSynced) {
      await deleteCalendarEvent(interview.interviewerId, interview.googleEventId);
    }

    revalidatePath("/dashboard/interviews");
    return { success: true };
  } catch (error) {
    console.error("Cancel Interview Error:", error);
    return { success: false, error: "Failed to cancel interview" };
  }
}
