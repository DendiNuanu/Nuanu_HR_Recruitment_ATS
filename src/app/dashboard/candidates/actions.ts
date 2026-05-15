"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { delCache } from "@/lib/cache";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const STAGES = [
  "applied",
  "screening",
  "hr_interview",
  "user_interview",
  "final_interview",
  "offer",
  "hired",
];

export async function updateCandidateStage(
  applicationId: string,
  action: "next" | "reject",
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
