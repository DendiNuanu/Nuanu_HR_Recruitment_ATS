"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export async function startOnboarding(data: {
  applicationId: string;
  departmentId?: string;
}) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true, vacancy: true }
    });

    if (!application) throw new Error("Application not found");

    // 1. Move to Onboarding Stage
    await prisma.application.update({
      where: { id: data.applicationId },
      data: { currentStage: "hired" } // In this ATS, hired means onboarding starts
    });

    // 2. Create User record if it doesn't exist (simulating employee creation)
    const user = await prisma.user.upsert({
      where: { email: application.candidate.email },
      update: {
        departmentId: data.departmentId || application.vacancy.departmentId
      },
      create: {
        email: application.candidate.email,
        name: application.candidate.name,
        password: "", // Should be set by user later
        departmentId: data.departmentId || application.vacancy.departmentId,
      }
    });

    // 3. Create Default Onboarding Tasks
    const defaultTasks = [
      "Submit identification documents",
      "Sign employment contract",
      "Attend orientation session",
      "Setup workstation and email",
      "Complete compliance training"
    ];

    await prisma.onboardingTask.createMany({
      data: defaultTasks.map(title => ({
        userId: user.id,
        title,
        status: "pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
      }))
    });

    // 4. Notify Admin
    const admin = await prisma.user.findFirst({ where: { userRoles: { some: { role: { slug: 'admin' } } } } });
    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Onboarding Started",
        message: `Onboarding has been initiated for ${application.candidate.name}`,
        link: `/dashboard/onboarding`,
      });
    }

    revalidatePath("/dashboard/onboarding");
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("Start Onboarding Error:", error);
    return { success: false, error: "Failed to start onboarding" };
  }
}
