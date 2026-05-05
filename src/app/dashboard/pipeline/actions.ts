"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { delCache } from "@/lib/cache";

export async function moveApplication(applicationId: string, toStage: string) {
  try {
    const app = await prisma.application.update({
      where: { id: applicationId },
      data: { currentStage: toStage.toLowerCase() },
      include: { candidate: true, vacancy: true }
    });

    // Notify Admin
    const admin = await prisma.user.findFirst({ where: { userRoles: { some: { role: { slug: 'admin' } } } } });
    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Candidate Moved",
        message: `${app.candidate.name} has been moved to ${toStage.replace("_", " ")}`,
        link: `/dashboard/pipeline`,
      });
    }

    await delCache("dashboard_metrics");
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Move Application Error:", error);
    return { success: false, error: "Failed to move candidate" };
  }
}
