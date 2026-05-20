"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { delCache } from "@/lib/cache";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

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
    source?: string;
    appliedAt?: string;
  },
) {
  try {
    if (data.referPosition !== undefined || data.domicile !== undefined) {
      await prisma.candidateProfile.upsert({
        where: { userId },
        update: {
          ...(data.referPosition !== undefined && { referPosition: data.referPosition }),
          ...(data.domicile !== undefined && { domicile: data.domicile }),
        },
        create: {
          userId,
          referPosition: data.referPosition ?? null,
          domicile: data.domicile ?? null,
        },
      });
    }
    if (data.source !== undefined || data.appliedAt !== undefined) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          ...(data.source !== undefined && { source: data.source }),
          ...(data.appliedAt !== undefined && { appliedAt: new Date(data.appliedAt) }),
        },
      });
    }
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
      select: { currentStage: true, candidateId: true },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    let newStage = application.currentStage;

    if (actionOrStageId === "reject") {
      newStage = "rejected";
    } else if (actionOrStageId === "next") {
      // Fallback for any legacy calls
      newStage = "assessment"; 
    } else {
      newStage = actionOrStageId;
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          currentStage: newStage,
          status:
            newStage === "rejected"
              ? "rejected"
              : newStage === "hired"
                ? "hired"
                : "active",
          ...(newStage === "rejected" ? { rejectedAt: new Date() } : {}),
        },
      });

      // Synchronize Vacancy filledCount
      if (newStage === "hired" && application.currentStage !== "hired") {
        await tx.vacancy.update({
          where: {
            id: (
              await tx.application.findUnique({
                where: { id: applicationId },
                select: { vacancyId: true },
              })
            )?.vacancyId,
          },
          data: { filledCount: { increment: 1 } },
        });
      } else if (application.currentStage === "hired" && newStage !== "hired") {
        await tx.vacancy.update({
          where: {
            id: (
              await tx.application.findUnique({
                where: { id: applicationId },
                select: { vacancyId: true },
              })
            )?.vacancyId,
          },
          data: { filledCount: { decrement: 1 } },
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
      },
    });

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
        type: newStage === "hired" ? "system" : "interview",
        title: `Candidate Stage Updated`,
        message: `${candidate.name} has been moved to ${newStage.replace("_", " ")}`,
        link: `/dashboard/candidates`,
      });
    }

    // ── Auto rejection email to candidate ─────────────────────────────────
    if ((newStage === "rejected" || newStage === "withdrawn") && candidate) {
      try {
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { vacancy: { select: { title: true } } },
        });
        const position = appWithVacancy?.vacancy?.title ?? "the position";
        const companyName = process.env.NEXT_PUBLIC_APP_NAME ?? "Nuanu";

        await sendEmail({
          to: candidate.email,
          subject: `Update on Your Application — ${position}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">${companyName}</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600">HR Recruitment</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#0A1628;font-size:20px;font-weight:700">Application Update</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">Dear ${candidate.name},</p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">
            Thank you for your interest in the <strong>${position}</strong> role at ${companyName} and for taking the time to go through our recruitment process.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">
            After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. This was a difficult decision as we received many strong applications.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px">
            We encourage you to apply for future openings that match your skills and experience. We will keep your profile on file and may reach out if a suitable opportunity arises.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0">
            We wish you all the best in your career journey.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:16px 0 0">
            Warm regards,<br>
            <strong>${companyName} Recruitment Team</strong>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} ${companyName} · Enterprise HR Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      } catch (emailErr) {
        // Non-fatal — rejection email failure must never break stage update
        console.warn("[updateCandidateStage] Rejection email failed:", emailErr);
      }
    }

    // ── Auto employee transfer when hired ─────────────────────────────────
    if (newStage === "hired" && candidate) {
      try {
        const appWithVacancy = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { vacancy: { select: { title: true, departmentId: true } } },
        });
        const existing = await prisma.employee.findUnique({ where: { userId: candidate.id } });
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
        console.warn("[updateCandidateStage] Employee transfer failed (non-fatal):", empErr);
      }
    }

    await delCache("dashboard_metrics");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard");
    return { success: true, newStage };
  } catch (error) {
    console.error("Failed to update candidate stage:", error);
    return { success: false, error: "Failed to update stage" };
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
// CUSTOM FIELD CRUD
// ─────────────────────────────────────────────────────────────

export async function addCustomField(
  applicationId: string,
  fieldName: string,
  fieldValue: string,
) {
  try {
    const field = await prisma.applicationCustomField.create({
      data: {
        applicationId,
        fieldName: fieldName.trim(),
        fieldValue: fieldValue.trim(),
      },
    });
    revalidatePath("/dashboard/candidates");
    return { success: true, field };
  } catch (e: unknown) {
    console.error("Failed to add field:", e);
    const errorMessage = e instanceof Error ? e.message : "Failed to add field";
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
    return { success: false, error: "Failed to add field" };
  }
}

export async function updateCustomField(
  fieldId: string,
  fieldName: string,
  fieldValue: string,
) {
  try {
    const field = await prisma.applicationCustomField.update({
      where: { id: fieldId },
      data: {
        fieldName: fieldName.trim(),
        fieldValue: fieldValue.trim(),
        updatedAt: new Date(),
      },
    });
    revalidatePath("/dashboard/candidates");
    return { success: true, field };
  } catch (e: unknown) {
    console.error("Failed to update field:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Failed to update field";
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
    return { success: false, error: "Failed to update field" };
  }
}

export async function deleteCustomField(fieldId: string) {
  try {
    await prisma.applicationCustomField.delete({ where: { id: fieldId } });
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (e: unknown) {
    console.error("Failed to delete field:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Failed to delete field";
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
    return { success: false, error: "Failed to delete field" };
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

    // Upload to Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = getSupabaseAdmin();
      const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storagePath = `resumes/${safeFilename}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (!uploadError) {
        const { data } = supabase.storage
          .from("resumes")
          .getPublicUrl(storagePath);
        resumeUrl = data.publicUrl;
      }
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

    return { success: true };
  } catch (error) {
    console.error("Failed to send candidate email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function updateCandidateOverviewDetails(
  applicationId: string,
  candidateId: string,
  data: {
    domicile?: string;
    referPosition?: string;
    source?: string;
    appliedAt?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    await prisma.$transaction(async (tx) => {
      if (data.domicile !== undefined || data.referPosition !== undefined) {
        await tx.candidateProfile.update({
          where: { userId: candidateId },
          data: {
            ...(data.domicile !== undefined && { domicile: data.domicile }),
            ...(data.referPosition !== undefined && { referPosition: data.referPosition }),
          }
        });
      }

      if (data.source !== undefined || data.appliedAt !== undefined) {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            ...(data.source !== undefined && { source: data.source }),
            ...(data.appliedAt !== undefined && { appliedAt: new Date(data.appliedAt) }),
          }
        });
      }
    });

    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    console.error("Failed to update overview details:", error);
    return { success: false, error: "Failed to update details" };
  }
}
