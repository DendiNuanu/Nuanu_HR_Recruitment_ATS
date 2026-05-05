"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

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
    const app = await prisma.application.findUnique({ 
      where: { id: data.applicationId },
      include: { candidate: true }
    });
    
    if (app) {
      await prisma.activityLog.create({
        data: {
          userId: app.candidateId,
          action: `Sent a new assessment: ${data.title}`,
          resource: "Assessment",
          resourceId: data.applicationId,
        }
      });

      // Send Real Email Invitation
      await sendEmail({
        to: app.candidate.email,
        subject: `Assessment Invited: ${data.title}`,
        text: `Hi ${app.candidate.name},\n\nYou have been invited to complete the "${data.title}" assessment as part of your application. \n\nInstructions: ${data.description}\n\nPlease complete it at your earliest convenience.`,
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

export async function remindAssessment(assessmentId: string) {
  try {
    // In a real app, this would send an email/notification
    // For now, we'll just log it
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { application: { include: { candidate: true } } }
    });

    if (assessment) {
      await prisma.activityLog.create({
        data: {
          userId: assessment.application.candidateId,
          action: `Reminder sent for assessment: ${assessment.title}`,
          resource: "Assessment",
          resourceId: assessment.id,
        }
      });
      
      // Create a notification for the candidate
      await prisma.notification.create({
        data: {
          userId: assessment.application.candidateId,
          type: "assessment_reminder",
          title: "Assessment Reminder",
          message: `Please complete your "${assessment.title}" assessment.`,
          link: `/assessments/${assessment.id}`
        }
      });

      // Send Real Email Reminder
      await sendEmail({
        to: assessment.application.candidate.email,
        subject: `REMINDER: ${assessment.title} Assessment`,
        text: `Hi ${assessment.application.candidate.name},\n\nThis is a friendly reminder to complete your "${assessment.title}" assessment. \n\nPlease visit the portal to start the test.`,
      });
    }

    revalidatePath("/dashboard/screening");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to send reminder" };
  }
}

export async function cancelAssessment(assessmentId: string) {
  try {
    await prisma.assessment.delete({
      where: { id: assessmentId }
    });
    revalidatePath("/dashboard/screening");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to cancel assessment" };
  }
}

export async function createTemplate(data: {
  title: string;
  type: string;
  description: string;
  duration: number;
  passThreshold: number;
}) {
  try {
    await prisma.assessmentTemplate.create({
      data: {
        ...data,
        questions: [] // Default empty questions
      }
    });
    revalidatePath("/dashboard/screening");
    return { success: true };
  } catch (error) {
    console.error("Create Template Error:", error);
    return { success: false, error: "Failed to create template" };
  }
}
