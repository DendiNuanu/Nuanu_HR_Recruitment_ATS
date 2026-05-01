"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        currentStage: newStage,
        status: newStage === "rejected" ? "rejected" : newStage === "hired" ? "hired" : "active",
        ...(newStage === "rejected" ? { rejectedAt: new Date() } : {})
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

    revalidatePath("/dashboard/candidates");
    return { success: true, newStage };
  } catch (error) {
    console.error("Failed to update candidate stage:", error);
    return { success: false, error: "Failed to update stage" };
  }
}
