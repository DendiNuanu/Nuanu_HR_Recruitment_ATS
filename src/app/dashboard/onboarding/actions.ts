"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { checkRole } from "@/lib/rbac";

// ── FIX BUG: startOnboarding used "userId" but field is "employeeId" ──────────
export async function startOnboarding(data: {
  applicationId: string;
  departmentId?: string;
}) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true, vacancy: true },
    });
    if (!application) throw new Error("Application not found");

    // Move to onboarding stage (not hired — hired comes after onboarding completes)
    await prisma.application.update({
      where: { id: data.applicationId },
      data: { currentStage: "onboarding" },
    });

    // Upsert the candidate user
    const user = await prisma.user.upsert({
      where: { email: application.candidate.email },
      update: {
        departmentId:
          data.departmentId || application.vacancy.departmentId || undefined,
      },
      create: {
        email: application.candidate.email,
        name: application.candidate.name,
        password: "",
        departmentId:
          data.departmentId || application.vacancy.departmentId || undefined,
      },
    });

    // Auto-create Employee record (status: onboarding) if not exists
    try {
      const existingEmployee = await prisma.employee.findUnique({ where: { userId: user.id } });
      if (!existingEmployee) {
        const { generateCode } = await import("@/lib/utils");
        const startDate = new Date();
        await prisma.employee.create({
          data: {
            userId: user.id,
            employeeCode: generateCode("EMP"),
            position: application.vacancy.title,
            departmentId: data.departmentId || application.vacancy.departmentId || null,
            startDate,
            status: "onboarding",
            check90DueAt: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
            check180DueAt: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000),
          },
        });
      }
    } catch (empErr) {
      console.warn("Employee record creation failed (non-fatal):", empErr);
    }

    // Create default tasks — NOTE: field is "employeeId" NOT "userId"
    const defaultTasks = [
      {
        title: "Submit identification documents",
        category: "documentation",
        priority: 1,
      },
      {
        title: "Sign employment contract",
        category: "documentation",
        priority: 1,
      },
      {
        title: "Attend orientation session",
        category: "training",
        priority: 2,
      },
      {
        title: "Setup workstation and email account",
        category: "it_setup",
        priority: 2,
      },
      {
        title: "Complete compliance & safety training",
        category: "training",
        priority: 3,
      },
      {
        title: "Submit emergency contact information",
        category: "documentation",
        priority: 1,
      },
      {
        title: "Complete payroll and bank details form",
        category: "admin",
        priority: 1,
      },
    ];

    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.onboardingTask.createMany({
      data: defaultTasks.map((t) => ({
        employeeId: user.id, // ← CORRECT field name
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: "pending",
        dueDate,
      })),
      skipDuplicates: true,
    });

    // Notify admin
    const admin = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { slug: "admin" } } } },
    });
    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Onboarding Started",
        message: `Onboarding initiated for ${application.candidate.name} (${application.vacancy.title})`,
        link: "/dashboard/onboarding",
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

export async function completeTask(taskId: string) {
  try {
    await prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: "completed", completedAt: new Date() },
    });
    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Complete Task Error:", error);
    return { success: false, error: "Failed to complete task" };
  }
}

export async function reopenTask(taskId: string) {
  try {
    await prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: "pending", completedAt: null },
    });
    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Reopen Task Error:", error);
    return { success: false, error: "Failed to reopen task" };
  }
}

export async function addOnboardingTask(data: {
  employeeId: string;
  title: string;
  category?: string;
  dueDate?: string;
  notes?: string;
}) {
  try {
    await checkRole(["admin", "hr", "recruiter"]);
    await prisma.onboardingTask.create({
      data: {
        employeeId: data.employeeId,
        title: data.title,
        category: data.category || "general",
        status: "pending",
        dueDate: data.dueDate
          ? new Date(data.dueDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: data.notes || null,
      },
    });
    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Add Onboarding Task Error:", error);
    return { success: false, error: "Failed to add task" };
  }
}

export async function deleteOnboardingTask(taskId: string) {
  try {
    await checkRole(["admin", "hr"]);
    await prisma.onboardingTask.delete({ where: { id: taskId } });
    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Delete Onboarding Task Error:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function completeOnboarding(employeeId: string) {
  try {
    await checkRole(["admin", "hr"]);

    // Mark all remaining tasks as completed
    await prisma.onboardingTask.updateMany({
      where: { employeeId, status: { not: "completed" } },
      data: { status: "completed", completedAt: new Date() },
    });

    // ── Activate Employee record ──────────────────────────────────
    try {
      await prisma.employee.update({
        where: { userId: employeeId },
        data: { status: "active" },
      });
    } catch {
      // Employee record may not exist yet — create it
      try {
        const { generateCode } = await import("@/lib/utils");
        const user = await prisma.user.findUnique({
          where: { id: employeeId },
          include: {
            applications: {
              where: { currentStage: { in: ["onboarding", "hired"] } },
              include: { vacancy: { select: { title: true, departmentId: true } } },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        });
        if (user) {
          const startDate = new Date();
          await prisma.employee.create({
            data: {
              userId: employeeId,
              employeeCode: generateCode("EMP"),
              position: user.applications[0]?.vacancy?.title ?? "Employee",
              departmentId: user.applications[0]?.vacancy?.departmentId ?? null,
              startDate,
              status: "active",
              check90DueAt: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
              check180DueAt: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000),
            },
          });
        }
      } catch (createErr) {
        console.warn("Employee activation failed (non-fatal):", createErr);
      }
    }

    // ── Move application to hired stage ──────────────────────────
    try {
      await prisma.application.updateMany({
        where: {
          candidateId: employeeId,
          currentStage: "onboarding",
        },
        data: { currentStage: "hired", status: "hired" },
      });
    } catch {
      // Non-fatal
    }

    const [admin, employee] = await Promise.all([
      prisma.user.findFirst({
        where: { userRoles: { some: { role: { slug: "admin" } } } },
      }),
      prisma.user.findUnique({ where: { id: employeeId } }),
    ]);

    if (admin && employee) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Onboarding Completed",
        message: `${employee.name}'s onboarding checklist is 100% complete. Now Active.`,
        link: "/dashboard/onboarding",
      });
    }

    revalidatePath("/dashboard/onboarding");
    revalidatePath("/dashboard/employees");
    revalidatePath("/dashboard/pipeline");
    return { success: true };
  } catch (error) {
    console.error("Complete Onboarding Error:", error);
    return { success: false, error: "Failed to complete onboarding" };
  }
}
