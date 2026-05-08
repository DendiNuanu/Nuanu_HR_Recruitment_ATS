"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { checkRole } from "@/lib/rbac";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function notifyAdmin(title: string, message: string) {
  const admin = await prisma.user.findFirst({
    where: { userRoles: { some: { role: { slug: "admin" } } } },
  });
  if (admin) {
    await createNotification({
      userId: admin.id,
      type: "offer",
      title,
      message,
      link: "/dashboard/offers",
    });
  }
}

function revalidateOfferPaths() {
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/pipeline");
}

// ─── createOffer ──────────────────────────────────────────────────────────────

export async function createOffer(data: {
  applicationId: string;
  salary: number;
  bonus?: number;
  benefits?: string;
  equity?: string;
  startDate: string;
  expiresAt?: string;
  notes?: string;
}) {
  try {
    await checkRole(["admin", "hr"]);

    const offer = await prisma.offer.create({
      data: {
        applicationId: data.applicationId,
        salary: data.salary,
        bonus: data.bonus ?? null,
        benefits: data.benefits ?? null,
        equity: data.equity ?? null,
        startDate: new Date(data.startDate),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        notes: data.notes ?? null,
        status: "draft",
      },
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
    });

    await notifyAdmin(
      "Offer Draft Created",
      `A new offer draft has been created for ${offer.application.candidate.name} (${offer.application.vacancy.title})`,
    );

    revalidatePath("/dashboard/offers");
    return { success: true, offer };
  } catch (error) {
    console.error("Create Offer Error:", error);
    return { success: false, error: "Failed to create offer" };
  }
}

// ─── sendOffer ────────────────────────────────────────────────────────────────

export async function sendOffer(offerId: string) {
  try {
    await checkRole(["admin", "hr"]);

    // Fix: include vacancy so we can access vacancy.title below
    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: "sent", sentAt: new Date() },
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
    });

    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "offer" },
    });

    const { generateOfferPDF } = await import("@/lib/pdf/generateOffer");
    const pdfBuffer = await generateOfferPDF({
      candidateName: offer.application.candidate.name,
      vacancyTitle: offer.application.vacancy.title,
      salary: offer.salary,
      bonus: offer.bonus ?? undefined,
      benefits: offer.benefits ?? undefined,
      equity: offer.equity ?? undefined,
      startDate: offer.startDate?.toISOString() ?? new Date().toISOString(),
      expiresAt: offer.expiresAt?.toISOString() ?? undefined,
      companyName: "Nuanu",
      notes: offer.notes ?? undefined,
    });

    await sendEmail({
      to: offer.application.candidate.email,
      subject: `Official Job Offer: ${offer.application.vacancy.title} at Nuanu`,
      text: `Hi ${offer.application.candidate.name},\n\nWe are pleased to extend an official offer for the ${offer.application.vacancy.title} position.\n\nPlease find the attached offer letter for your review.\n\nBest regards,\nHR Team at Nuanu`,
      attachments: [
        {
          filename: `Job_Offer_${offer.application.candidate.name.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    revalidateOfferPaths();
    return { success: true };
  } catch (error) {
    console.error("Send Offer Error:", error);
    return { success: false, error: "Failed to send offer" };
  }
}

// ─── acceptOffer ──────────────────────────────────────────────────────────────

export async function acceptOffer(offerId: string) {
  try {
    await checkRole(["admin", "hr"]);

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: "accepted", respondedAt: new Date() },
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
    });

    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "hired", status: "hired" },
    });

    await notifyAdmin(
      "Offer Accepted",
      `${offer.application.candidate.name} has accepted the offer for ${offer.application.vacancy.title}.`,
    );

    await sendEmail({
      to: offer.application.candidate.email,
      subject: `Welcome to the Team! – ${offer.application.vacancy.title} at Nuanu`,
      text: `Dear ${offer.application.candidate.name},\n\nCongratulations! We are thrilled to confirm your acceptance of the ${offer.application.vacancy.title} position at Nuanu.\n\nOur HR team will be in touch shortly with onboarding details.\n\nWelcome aboard!\n\nBest regards,\nHR Team at Nuanu`,
    });

    revalidateOfferPaths();
    return { success: true };
  } catch (error) {
    console.error("Accept Offer Error:", error);
    return { success: false, error: "Failed to accept offer" };
  }
}

// ─── rejectOffer ──────────────────────────────────────────────────────────────

export async function rejectOffer(offerId: string, reason: string) {
  try {
    await checkRole(["admin", "hr"]);

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: "rejected",
        rejectionReason: reason,
        respondedAt: new Date(),
      },
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
    });

    // Keep the candidate in the offer stage so HR can revise or re-negotiate
    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "offer" },
    });

    await notifyAdmin(
      "Offer Rejected",
      `${offer.application.candidate.name} declined the offer for ${offer.application.vacancy.title}. Reason: ${reason}`,
    );

    revalidateOfferPaths();
    return { success: true };
  } catch (error) {
    console.error("Reject Offer Error:", error);
    return { success: false, error: "Failed to reject offer" };
  }
}

// ─── withdrawOffer ────────────────────────────────────────────────────────────

export async function withdrawOffer(offerId: string) {
  try {
    await checkRole(["admin", "hr"]);

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: "withdrawn" },
      include: {
        application: {
          include: { candidate: true, vacancy: true },
        },
      },
    });

    // Move candidate back to final interview stage
    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "final_interview" },
    });

    await notifyAdmin(
      "Offer Withdrawn",
      `The offer for ${offer.application.candidate.name} (${offer.application.vacancy.title}) has been withdrawn.`,
    );

    revalidateOfferPaths();
    return { success: true };
  } catch (error) {
    console.error("Withdraw Offer Error:", error);
    return { success: false, error: "Failed to withdraw offer" };
  }
}

// ─── deleteDraftOffer ─────────────────────────────────────────────────────────

export async function deleteDraftOffer(offerId: string) {
  try {
    await checkRole(["admin", "hr"]);

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) return { success: false, error: "Offer not found" };
    if (offer.status !== "draft") {
      return { success: false, error: "Only draft offers can be deleted" };
    }

    await prisma.offer.delete({ where: { id: offerId } });

    revalidatePath("/dashboard/offers");
    return { success: true };
  } catch (error) {
    console.error("Delete Draft Offer Error:", error);
    return { success: false, error: "Failed to delete draft offer" };
  }
}

// ─── editOffer ────────────────────────────────────────────────────────────────

export async function editOffer(
  offerId: string,
  data: {
    salary: number;
    bonus?: number;
    benefits?: string;
    equity?: string;
    startDate: string;
    expiresAt?: string;
    notes?: string;
  },
) {
  try {
    await checkRole(["admin", "hr"]);

    await prisma.offer.update({
      where: { id: offerId },
      data: {
        salary: data.salary,
        bonus: data.bonus ?? null,
        benefits: data.benefits ?? null,
        equity: data.equity ?? null,
        startDate: new Date(data.startDate),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/dashboard/offers");
    return { success: true };
  } catch (error) {
    console.error("Edit Offer Error:", error);
    return { success: false, error: "Failed to edit offer" };
  }
}
