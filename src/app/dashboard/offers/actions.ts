"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

export async function createOffer(data: {
  applicationId: string;
  salary: number;
  bonus?: number;
  startDate: string;
  notes?: string;
}) {
  try {
    const offer = await prisma.offer.create({
      data: {
        applicationId: data.applicationId,
        salary: data.salary,
        bonus: data.bonus,
        startDate: new Date(data.startDate),
        notes: data.notes,
        status: "draft",
      },
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          }
        }
      }
    });

    // Notify Admin
    const admin = await prisma.user.findFirst({ where: { userRoles: { some: { role: { slug: 'admin' } } } } });
    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "offer",
        title: "Offer Draft Created",
        message: `A new offer draft has been created for ${offer.application.candidate.name} (${offer.application.vacancy.title})`,
        link: `/dashboard/offers`,
      });
    }

    revalidatePath("/dashboard/offers");
    return { success: true, offer };
  } catch (error) {
    console.error("Create Offer Error:", error);
    return { success: false, error: "Failed to create offer" };
  }
}

export async function sendOffer(offerId: string) {
  try {
    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: "sent" },
      include: {
        application: {
          include: {
            candidate: true,
          }
        }
      }
    });

    // Update Application Stage
    await prisma.application.update({
      where: { id: offer.applicationId },
      data: { currentStage: "offer" }
    });

    // Notify Candidate (Real Email)
    await sendEmail({
      to: offer.application.candidate.email,
      subject: `Official Job Offer: ${offer.application.vacancy.title} at Nuanu`,
      text: `Hi ${offer.application.candidate.name},\n\nWe are pleased to extend an official offer for the ${offer.application.vacancy.title} position. \n\nSalary: ${offer.salary}\nStart Date: ${offer.startDate.toLocaleDateString()}\n\nPlease visit your candidate portal to review and accept the offer.`,
    });

    revalidatePath("/dashboard/offers");
    revalidatePath("/dashboard/candidates");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to send offer" };
  }
}
