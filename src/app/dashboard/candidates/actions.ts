"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { delCache } from "@/lib/cache";
import { getSession } from "@/lib/auth";
import { normalizePipelineStage } from "@/lib/utils";
import { deleteCandidatesByEmails } from "@/lib/delete-candidate";

function buildRejectionEmailBodies(params: {
  candidateName: string;
  position: string;
  companyName: string;
}) {
  const { candidateName, position, companyName } = params;
  const text = [
    `Dear ${candidateName},`,
    "",
    `Thank you for your interest in the ${position} role at ${companyName} and for taking the time to go through our recruitment process.`,
    "",
    "After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.",
    "",
    "We encourage you to apply for future openings that match your skills and experience.",
    "",
    "Warm regards,",
    `${companyName} Recruitment Team`,
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#0A1628">Application Update</h2>
      <p>Dear ${candidateName},</p>
      <p>Thank you for your interest in the <strong>${position}</strong> position at ${companyName}.</p>
      <p>After careful consideration, we will not be moving forward with your application at this time. We encourage you to apply for future opportunities that match your profile.</p>
      <p>Warm regards,<br/><strong>${companyName} Recruitment Team</strong></p>
    </div>`;

  return { text, html };
}

/**
 * Update editable overview fields on a candidate profile/application.
 * applicationId = Application.id, userId = User.id (candidateId)
 */
export async function updateCandidateOverviewDetails(
  applicationId: string,
  userId: string,
  data: {
    referPosition?: string;
    domicile?: string;
    salaryExpectation?: string;
    source?: string;
    appliedAt?: string;
  },
) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      if (
        data.referPosition !== undefined ||
        data.domicile !== undefined ||
        data.salaryExpectation !== undefined
      ) {
        await tx.candidateProfile.upsert({
          where: { userId },
          update: {
            ...(data.referPosition !== undefined && {
              referPosition: data.referPosition,
            }),
            ...(data.domicile !== undefined && { domicile: data.domicile }),
            ...(data.salaryExpectation !== undefined && {
              salaryExpectation: data.salaryExpectation,
            }),
          },
          create: {
            userId,
            referPosition: data.referPosition ?? null,
            domicile: data.domicile ?? null,
            salaryExpectation: data.salaryExpectation ?? null,
          },
        });
      }

      if (data.source !== undefined || data.appliedAt !== undefined) {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            ...(data.source !== undefined && { source: data.source }),
            ...(data.appliedAt !== undefined && {
              appliedAt: new Date(data.appliedAt),
            }),
          },
        });
      }
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("updateCandidateOverviewDetails error:", error);
    return { success: false, error: "Failed to update" };
  }
}

export async function updateCandidateStage(
  applicationId: string,
  actionOrStageId: string,
) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { currentStage: true, candidateId: true, vacancyId: true },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    const previousStage = application.currentStage;
    const previousCanonical = normalizePipelineStage(previousStage);
    let newStage = application.currentStage;

    if (actionOrStageId === "reject") {
      newStage = "rejected";
    } else if (actionOrStageId === "next") {
      newStage = "assessment";
    } else {
      newStage = normalizePipelineStage(actionOrStageId);
    }

    const newCanonical = normalizePipelineStage(newStage);
    const enteringRejected = newCanonical === "rejected";
    const leavingRejected =
      previousCanonical === "rejected" && newCanonical !== "rejected";

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          currentStage: newCanonical,
          status:
            newCanonical === "rejected"
              ? "rejected"
              : newCanonical === "hired"
                ? "hired"
                : "active",
          ...(enteringRejected ? { rejectedAt: new Date() } : {}),
          ...(leavingRejected
            ? {
                rejectedAt: null,
                emailSentAt: null,
                emailSentSubject: null,
              }
            : {}),
        },
      });

      // Synchronize Vacancy filledCount
      if (application.vacancyId) {
        if (
          newCanonical === "hired" &&
          normalizePipelineStage(application.currentStage) !== "hired"
        ) {
          await tx.vacancy.update({
            where: { id: application.vacancyId },
            data: { filledCount: { increment: 1 } },
          });
        } else if (
          normalizePipelineStage(application.currentStage) === "hired" &&
          newCanonical !== "hired"
        ) {
          await tx.vacancy.update({
            where: { id: application.vacancyId },
            data: { filledCount: { decrement: 1 } },
          });
        }
      }
    });

    // Log this activity (non-fatal)
    try {
      await prisma.activityLog.create({
        data: {
          userId: application.candidateId,
          action: `Candidate moved to ${newCanonical.replace(/_/g, " ")} stage`,
          resource: "Application",
          resourceId: applicationId,
        },
      });
    } catch (logErr) {
      console.warn("[updateCandidateStage] Activity log failed:", logErr);
    }

    // Create Real Notification
    const admin = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { slug: "admin" } } } },
    });
    const candidate = await prisma.user.findUnique({
      where: { id: application.candidateId },
    });

    if (admin && candidate) {
      await createNotification({
        userId: admin.id,
        type: newCanonical === "hired" ? "system" : "interview",
        title: `Candidate Stage Updated`,
        message: `${candidate.name} has been moved to ${newCanonical.replace(/_/g, " ")}`,
        link: `/dashboard/candidates`,
      });
    }

    // ── Auto rejection email when moving into rejected / withdrawn ────────
    let rejectionEmailSentTo: string | null = null;
    let rejectionEmailSentAt: string | null = null;
    let rejectionEmailSubject: string | null = null;
    let rejectionEmailError: string | null = null;
    const shouldSendRejectionEmail =
      enteringRejected &&
      previousCanonical !== newCanonical &&
      !!candidate?.email;

    if (shouldSendRejectionEmail) {
      try {
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { vacancy: { select: { title: true } } },
        });
        const position = appWithVacancy?.vacancy?.title ?? "the position";
        const companyName = process.env.NEXT_PUBLIC_APP_NAME ?? "Nuanu";
        const rejectionSubject = `Update on Your Application — ${position}`;
        const { text, html } = buildRejectionEmailBodies({
          candidateName: candidate.name,
          position,
          companyName,
        });

        const emailResult = await sendEmail({
          to: candidate.email,
          subject: rejectionSubject,
          text,
          html,
        });

        if (emailResult.success) {
          const sentAt = new Date();
          rejectionEmailSentTo = candidate.email;
          rejectionEmailSentAt = sentAt.toISOString();
          rejectionEmailSubject = rejectionSubject;

          await prisma.application.update({
            where: { id: applicationId },
            data: {
              emailSentAt: sentAt,
              emailSentSubject: rejectionSubject,
            },
          });

          try {
            await prisma.activityLog.create({
              data: {
                userId: application.candidateId,
                action: `Rejection email sent: ${rejectionSubject}`,
                resource: "Application",
                resourceId: applicationId,
                metadata: { subject: rejectionSubject, type: "rejection_auto" },
              },
            });
          } catch {
            // Non-fatal
          }
        } else {
          rejectionEmailError = emailResult.error ?? "Email delivery failed";
          console.warn(
            "[updateCandidateStage] Rejection email failed:",
            rejectionEmailError,
          );
        }
      } catch (emailErr) {
        rejectionEmailError =
          emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.warn(
          "[updateCandidateStage] Rejection email failed:",
          rejectionEmailError,
        );
      }
    }

    // ── Auto employee transfer when hired ─────────────────────────────────
    if (newCanonical === "hired" && candidate) {
      try {
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { vacancy: { select: { title: true, departmentId: true } } },
        });
        const existing = await prisma.employee.findUnique({
          where: { userId: candidate.id },
        });
        if (!existing) {
          const empCode = `EMP-${Date.now().toString(36).toUpperCase()}`;
          const startDate = new Date();
          await prisma.employee.create({
            data: {
              userId: candidate.id,
              employeeCode: empCode,
              position: appWithVacancy?.vacancy?.title ?? "Employee",
              departmentId: appWithVacancy?.vacancy?.departmentId ?? null,
              startDate,
              status: "active",
              check90DueAt: new Date(startDate.getTime() + 90 * 86_400_000),
              check180DueAt: new Date(startDate.getTime() + 180 * 86_400_000),
            },
          });
        }
      } catch (empErr) {
        console.warn(
          "[updateCandidateStage] Employee transfer failed (non-fatal):",
          empErr,
        );
      }
    }

    await delCache("dashboard_metrics");
    updateTag("applications");
    updateTag("candidates");
    updateTag("dashboard");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/talent-bank");
    return {
      success: true,
      newStage: newCanonical,
      rejectionEmailSentTo,
      rejectionEmailSentAt,
      rejectionEmailSubject,
      rejectionEmailFailed:
        shouldSendRejectionEmail && !rejectionEmailSentTo,
      rejectionEmailError,
      clearedRejectionEmail: leavingRejected,
    };
  } catch (error) {
    console.error("Failed to update candidate stage:", error);
    return { success: false, error: "Failed to update stage" };
  }
}

/** Permanently remove a duplicate candidate (and applications) by email — admin only. */
export async function deleteCandidateByEmail(email: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const roles = session.roles ?? [];
    if (!roles.some((r) => r === "admin" || r === "super_admin")) {
      return { success: false, error: "Forbidden" };
    }

    const trimmed = email.trim();
    if (!trimmed) {
      return { success: false, error: "Email is required" };
    }

    const result = await deleteCandidatesByEmails(prisma, [trimmed], {
      execute: true,
    });

    if (result.deleted.length === 0) {
      return { success: false, error: "No candidate found with that email" };
    }

    await delCache("dashboard_metrics");
    updateTag("applications");
    updateTag("candidates");
    updateTag("dashboard");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/talent-bank");

    return {
      success: true,
      deleted: result.deleted,
    };
  } catch (error) {
    console.error("deleteCandidateByEmail error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete candidate";
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────
// NOTE CRUD
// ─────────────────────────────────────────────────────────────

/** Fetch notes for an application (used server-side in page.tsx) */
export async function getNotes(applicationId: string) {
  return prisma.candidateNote.findMany({
    where: { applicationId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addNote(applicationId: string, content: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const note = await prisma.candidateNote.create({
      data: { applicationId, content: content.trim(), authorId: session.id },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    revalidatePath("/dashboard/candidates");
    return { success: true, note };
  } catch (e: unknown) {
    console.error("Failed to add note:", e);
    const errorMessage = e instanceof Error ? e.message : "Failed to add note";
    // Check if it's a table不存在 error
    if (
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("does not exist")
    ) {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration.",
      };
    }
    return { success: false, error: "Failed to add note" };
  }
}

export async function editNote(noteId: string, content: string) {
  try {
    const note = await prisma.candidateNote.update({
      where: { id: noteId },
      data: { content: content.trim(), updatedAt: new Date() },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    revalidatePath("/dashboard/candidates");
    return { success: true, note };
  } catch (e: unknown) {
    console.error("Failed to edit note:", e);
    const errorMessage = e instanceof Error ? e.message : "Failed to edit note";
    if (
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("does not exist")
    ) {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration.",
      };
    }
    return { success: false, error: "Failed to edit note" };
  }
}

export async function deleteNote(noteId: string) {
  try {
    await prisma.candidateNote.delete({ where: { id: noteId } });
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (e: unknown) {
    console.error("Failed to delete note:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Failed to delete note";
    if (
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("does not exist")
    ) {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration.",
      };
    }
    return { success: false, error: "Failed to delete note" };
  }
}

// ─────────────────────────────────────────────────────────────
// INTERVIEW COMMENT CRUD
// ─────────────────────────────────────────────────────────────

/** Fetch interview comments for an application (used server-side in page.tsx) */
export async function getInterviewComments(applicationId: string) {
  return prisma.interviewComment.findMany({
    where: { applicationId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addInterviewComment(
  applicationId: string,
  content: string,
) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized" };

    const comment = await prisma.interviewComment.create({
      data: {
        applicationId,
        content: content.trim(),
        authorId: session.id,
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    revalidatePath("/dashboard/candidates");
    return { success: true, comment };
  } catch (e: unknown) {
    console.error("Failed to add interview comment:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Failed to add comment";
    if (
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("does not exist")
    ) {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration.",
      };
    }
    return { success: false, error: "Failed to add comment" };
  }
}

export async function deleteInterviewComment(commentId: string) {
  try {
    await prisma.interviewComment.delete({ where: { id: commentId } });
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (e: unknown) {
    console.error("Failed to delete interview comment:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Failed to delete comment";
    if (
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("does not exist")
    ) {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration.",
      };
    }
    return { success: false, error: "Failed to delete comment" };
  }
}

// ─────────────────────────────────────────────────────────────
// CV / RESUME UPLOAD (server action wrapping Supabase)
// ─────────────────────────────────────────────────────────────

export async function uploadCandidateResume(
  applicationId: string,
  formData: FormData,
) {
  try {
    const file = formData.get("resume") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    // Get the candidate userId from the application
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true, candidate: { select: { name: true } } },
    });
    if (!app) return { success: false, error: "Application not found" };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let resumeUrl = "";
    let resumeText = "";

    // Upload to local filesystem
    try {
      const { uploadResumeBuffer } = await import("@/lib/resume-storage");
      resumeUrl = await uploadResumeBuffer(buffer, file.name, file.type) || "";
    } catch {
      /* non-fatal */
    }

    // Extract text if PDF
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const parsed = await pdfParse(buffer);
        resumeText = parsed.text || "";
      } catch {
        /* non-fatal */
      }
    }

    // Create Document record
    await prisma.document.create({
      data: {
        applicationId,
        name: file.name,
        type: "resume",
        fileUrl: resumeUrl || "pending",
        fileSize: buffer.byteLength,
        mimeType: file.type || "application/octet-stream",
      },
    });

    // Update CandidateProfile
    await prisma.candidateProfile.upsert({
      where: { userId: app.candidateId },
      update: {
        ...(resumeUrl && { resumeUrl }),
        ...(resumeText && { resumeText }),
      },
      create: {
        userId: app.candidateId,
        ...(resumeUrl && { resumeUrl }),
        ...(resumeText && { resumeText }),
      },
    });

    revalidatePath("/dashboard/candidates");
    return { success: true, resumeUrl };
  } catch (e) {
    console.error("Resume upload error:", e);
    return { success: false, error: "Upload failed" };
  }
}

export async function sendCandidateEmail(data: {
  candidateId: string;
  applicationId?: string;
  to: string;
  subject: string;
  body: string;
}) {
  try {
    const result = await sendEmail({
      to: data.to,
      subject: data.subject,
      text: data.body,
    });

    if (!result.success) {
      // Propagate configMissing so the client can offer a mailto: fallback
      return {
        success: false,
        error: result.error,
        configMissing:
          (result as { configMissing?: boolean }).configMissing ?? false,
      };
    }

    // Log this activity (non-fatal if it fails)
    try {
      await prisma.activityLog.create({
        data: {
          userId: data.candidateId,
          action: `Email sent: ${data.subject}`,
          resource: "Candidate",
          resourceId: data.candidateId,
          metadata: { subject: data.subject },
        },
      });
      // Persist emailSentAt on the application record
      if (data.applicationId) {
        await prisma.application.update({
          where: { id: data.applicationId },
          data: {
            emailSentAt: new Date(),
            emailSentSubject: data.subject,
          },
        });
      }
    } catch {
      // activity log failure must not break email success
    }

    updateTag("applications");
    updateTag("candidates");
    updateTag("dashboard");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/candidates");

    return { success: true };
  } catch (error) {
    console.error("Failed to send candidate email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
