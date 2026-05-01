"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function scheduleInterview(data: {
  applicationId: string;
  type: string;
  scheduledAt: string;
  location: string;
  meetingUrl?: string;
}) {
  try {
    // We need an interviewerId. Let's just pick the first admin user or a dummy.
    const adminUser = await prisma.user.findFirst({
      where: { email: { contains: "admin" } }
    });

    if (!adminUser) throw new Error("No admin user found to assign interview");

    await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        interviewerId: adminUser.id,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        location: data.location,
        meetingUrl: data.meetingUrl || null,
        status: "scheduled",
        stage: data.type === "video" ? "hr_interview" : "tech_interview"
      }
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
