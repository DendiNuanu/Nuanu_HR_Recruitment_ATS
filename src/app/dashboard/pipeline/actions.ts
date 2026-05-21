"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { delCache } from "@/lib/cache";
import { sendEmail } from "@/lib/email";
import {
  generateCode,
  normalizePipelineStage,
  PIPELINE_STAGE_IDS,
} from "@/lib/utils";

const VALID_STAGES = new Set(PIPELINE_STAGE_IDS);

export async function moveApplication(applicationId: string, toStage: string) {
  try {
    const stage = normalizePipelineStage(toStage);
    if (!VALID_STAGES.has(stage as (typeof PIPELINE_STAGE_IDS)[number])) {
      return { success: false, error: "Invalid stage" };
    }

    const app = await prisma.application.update({
      where: { id: applicationId },
      data: {
        currentStage: stage,
        lastActivityAt: new Date(),
        status:
          stage === "rejected"
            ? "rejected"
            : stage === "hired"
              ? "hired"
              : "active",
        ...(stage === "rejected" ? { rejectedAt: new Date() } : {}),
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vacancy: {
          select: {
            title: true,
            departmentId: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    await prisma.pipelineStage.create({
      data: {
        applicationId,
        stage,
        enteredAt: new Date(),
      },
    });

    if (stage === "hired" || stage === "onboarding") {
      try {
        const existing = await prisma.employee.findUnique({
          where: { userId: app.candidateId },
        });
        if (!existing) {
          const startDate = new Date();
          await prisma.employee.create({
            data: {
              userId: app.candidateId,
              employeeCode: generateCode("EMP"),
              position: app.vacancy.title,
              departmentId: app.vacancy.departmentId,
              startDate,
              status: stage === "hired" ? "active" : "onboarding",
              check90DueAt: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
              check180DueAt: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000),
            },
          });
        } else if (stage === "hired" && existing.status === "onboarding") {
          await prisma.employee.update({
            where: { userId: app.candidateId },
            data: { status: "active" },
          });
        }
      } catch (empErr) {
        console.warn("Employee record creation failed (non-fatal):", empErr);
      }
    }

    if (stage === "rejected") {
      try {
        await sendEmail({
          to: app.candidate.email,
          subject: `Application Update — ${app.vacancy.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
              <h2>Thank you for your interest in Nuanu</h2>
              <p>Dear ${app.candidate.name},</p>
              <p>We appreciate the time you invested in applying for the <strong>${app.vacancy.title}</strong> position.</p>
              <p>After careful consideration, we will not be moving forward with your application at this time. We encourage you to apply for future opportunities that match your profile.</p>
              <p>Thank you again for your interest in Nuanu.</p>
              <br/>
              <p>Best regards,<br/>Nuanu HR Team</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Rejection email failed (non-blocking):", emailErr);
      }
    }

    const admin = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { slug: "admin" } } } },
    });
    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Candidate Moved",
        message: `${app.candidate.name} → ${stage.replace(/_/g, " ")} (${app.vacancy.title})`,
        link: `/dashboard/pipeline`,
      });
    }

    try {
      const appWithRecruiter = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { vacancy: { select: { recruiterId: true } } },
      });
      const recruiterId = appWithRecruiter?.vacancy?.recruiterId;
      if (recruiterId && recruiterId !== admin?.id) {
        await createNotification({
          userId: recruiterId,
          type: "system",
          title: "Candidate Stage Updated",
          message: `${app.candidate.name} has been moved to ${stage.replace(/_/g, " ")}`,
          link: `/dashboard/pipeline`,
        });
      }
    } catch {
      // Non-fatal
    }

    await delCache("dashboard_metrics");
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/employees");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Move Application Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
