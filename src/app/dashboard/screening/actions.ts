"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAssessment(data: {
  applicationId: string;
  type: string;
  title: string;
  description: string;
  maxScore: number;
}) {
  try {
    await prisma.assessment.create({
      data: {
        applicationId: data.applicationId,
        type: data.type,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore,
        status: "pending"
      }
    });

    // Update Application Stage
    await prisma.application.update({
      where: { id: data.applicationId },
      data: {
        currentStage: "screening"
      }
    });

    // Log Activity
    const app = await prisma.application.findUnique({ where: { id: data.applicationId } });
    if (app) {
      await prisma.activityLog.create({
        data: {
          userId: app.candidateId,
          action: `Sent a new assessment: ${data.title}`,
          resource: "Assessment",
          resourceId: data.applicationId,
        }
      });
    }

    revalidatePath("/dashboard/screening");
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("Create Assessment Error:", error);
    return { success: false, error: "Failed to create assessment" };
  }
}
