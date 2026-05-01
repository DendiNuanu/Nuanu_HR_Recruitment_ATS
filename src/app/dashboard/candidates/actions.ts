"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

const STAGES = [
  "applied",
  "screening",
  "hr_interview",
  "user_interview",
  "final_interview",
  "offer",
  "hired"
];

export async function updateCandidateStage(applicationId: string, action: "next" | "reject") {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { currentStage: true, candidateId: true }
    });

    if (!application) {
      throw new Error("Application not found");
    }

    let newStage = application.currentStage;

    if (action === "reject") {
      newStage = "rejected";
    } else if (action === "next") {
      const currentIndex = STAGES.indexOf(application.currentStage);
      if (currentIndex !== -1 && currentIndex < STAGES.length - 1) {
        newStage = STAGES[currentIndex + 1];
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          currentStage: newStage,
          status: newStage === "rejected" ? "rejected" : newStage === "hired" ? "hired" : "active",
          ...(newStage === "rejected" ? { rejectedAt: new Date() } : {})
        }
      });

      // Synchronize Vacancy filledCount
      if (newStage === "hired" && application.currentStage !== "hired") {
        await tx.vacancy.update({
          where: { id: (await tx.application.findUnique({ where: { id: applicationId }, select: { vacancyId: true } }))?.vacancyId },
          data: { filledCount: { increment: 1 } }
        });
      } else if (application.currentStage === "hired" && newStage !== "hired") {
        await tx.vacancy.update({
          where: { id: (await tx.application.findUnique({ where: { id: applicationId }, select: { vacancyId: true } }))?.vacancyId },
          data: { filledCount: { decrement: 1 } }
        });
      }
    });

    // Log this activity
    await prisma.activityLog.create({
      data: {
        userId: application.candidateId,
        action: `Candidate moved to ${newStage.replace("_", " ")} stage`,
        resource: "Application",
        resourceId: applicationId,
      }
    });

    // Create Real Notification
    const admin = await prisma.user.findFirst({ where: { userRoles: { some: { role: { slug: 'admin' } } } } });
    const candidate = await prisma.user.findUnique({ where: { id: application.candidateId } });
    
    if (admin && candidate) {
      await createNotification({
        userId: admin.id,
        type: newStage === "hired" ? "system" : "interview",
        title: `Candidate Stage Updated`,
        message: `${candidate.name} has been moved to ${newStage.replace("_", " ")}`,
        link: `/dashboard/candidates`,
      });
    }

    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    return { success: true, newStage };
  } catch (error) {
    console.error("Failed to update candidate stage:", error);
    return { success: false, error: "Failed to update stage" };
  }
}
