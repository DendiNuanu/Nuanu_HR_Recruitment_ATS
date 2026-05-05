import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function createRequisition(vacancyId: string, requestedById: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create JobRequisition
    const requisition = await tx.jobRequisition.create({
      data: {
        vacancyId,
        requestedById,
        status: "PENDING",
        currentStep: 1,
      },
    });

    // 2. Define Steps
    // In a real system, you'd find specific users for these roles.
    // For this ATS, we'll find any user with the corresponding role slug,
    // defaulting to the super-admin if no specific role user is found for demo purposes.
    
    const steps = [
      { role: "MANAGER", order: 1 },
      { role: "HR", order: 2 },
      { role: "FINANCE", order: 3 },
    ];

    // Find a fallback approver (Super Admin)
    const admin = await tx.user.findFirst({
      where: { userRoles: { some: { role: { slug: "super-admin" } } } }
    });

    if (!admin) throw new Error("No admin user found for approval fallback.");

    // Create Approval records
    for (const step of steps) {
      // Logic: Try to find a user with this role slug. 
      // For simplicity in this demo, we'll assign the first user found or fallback to admin.
      const roleUser = await tx.user.findFirst({
        where: { userRoles: { some: { role: { slug: step.role.toLowerCase() } } } }
      });

      await tx.approval.create({
        data: {
          requisitionId: requisition.id,
          approverId: roleUser?.id || admin.id,
          role: step.role,
          status: "PENDING",
        },
      });
    }

    // Update Vacancy status to 'pending_approval' if it exists in STAGES or just keep it draft
    await tx.vacancy.update({
      where: { id: vacancyId },
      data: { status: "pending_approval" as any }
    });

    // Notify first approver
    const firstApproval = await tx.approval.findFirst({
      where: { requisitionId: requisition.id, role: "MANAGER" }
    });
    
    if (firstApproval) {
      await createNotification({
        userId: firstApproval.approverId,
        type: "system",
        title: "New Job Requisition",
        message: "A new job vacancy requires your approval.",
        link: "/dashboard/requisitions",
      });
    }

    return requisition;
  });
}

export async function approveStep(requisitionId: string, approverId: string, comment?: string) {
  return await prisma.$transaction(async (tx) => {
    const requisition = await tx.jobRequisition.findUnique({
      where: { id: requisitionId },
      include: { approvals: { orderBy: { id: 'asc' } } } // Note: we should have a better way to order than ID, maybe a 'step' field in Approval
    });

    if (!requisition) throw new Error("Requisition not found");

    // Map role to step index
    const roleOrder = ["MANAGER", "HR", "FINANCE"];
    const currentRole = roleOrder[requisition.currentStep - 1];

    // Check if user is Super Admin (bypass)
    const user = await tx.user.findUnique({
      where: { id: approverId },
      include: { userRoles: { include: { role: true } } }
    });
    const isSuperAdmin = user?.userRoles.some(ur => ur.role.slug === "super-admin");

    const currentApproval = await tx.approval.findFirst({
      where: {
        requisitionId,
        role: currentRole,
        status: "PENDING"
      }
    });

    if (!currentApproval) {
      throw new Error("This requisition has no pending approval step for the current phase.");
    }

    if (!isSuperAdmin && currentApproval.approverId !== approverId) {
      throw new Error(`AUTHORIZED ERROR: This step currently requires approval from ${currentRole}. Please wait for them to approve or login as an Administrator.`);
    }

    try {
      // Update current approval
      await tx.approval.update({
        where: { id: currentApproval.id },
        data: {
          status: "APPROVED",
          comment,
          approvedAt: new Date(),
        }
      });

      if (requisition.currentStep < 3) {
        // Move to next step
        const nextStep = requisition.currentStep + 1;
        await tx.jobRequisition.update({
          where: { id: requisitionId },
          data: { currentStep: nextStep }
        });

        // Notify next approver
        const nextRole = roleOrder[nextStep - 1];
        const nextApproval = await tx.approval.findFirst({
          where: { requisitionId, role: nextRole }
        });

        if (nextApproval) {
          await createNotification({
            userId: nextApproval.approverId,
            type: "system",
            title: "Job Requisition Approval Required",
            message: `Requisition approved by ${currentRole}. Your approval is now required.`,
            link: "/dashboard/requisitions",
          });
        }
      } else {
        // Final step approved
        await tx.jobRequisition.update({
          where: { id: requisitionId },
          data: { status: "APPROVED" }
        });

        await tx.vacancy.update({
          where: { id: requisition.vacancyId },
          data: { 
            isApproved: true,
            status: "approved"
          }
        });

        // Notify requester
        await createNotification({
          userId: requisition.requestedById,
          type: "system",
          title: "Requisition Fully Approved",
          message: "Your job vacancy has been fully approved and can now be published.",
          link: "/dashboard/jobs",
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("approveStep Error:", error);
      throw error;
    }
  });
}

export async function rejectRequisition(requisitionId: string, approverId: string, comment: string) {
  return await prisma.$transaction(async (tx) => {
    try {
      const requisition = await tx.jobRequisition.findUnique({
        where: { id: requisitionId }
      });

      if (!requisition) throw new Error("Requisition not found");

      // Mark current step as rejected
      await tx.approval.updateMany({
        where: {
          requisitionId,
          approverId,
          status: "PENDING"
        },
        data: {
          status: "REJECTED",
          comment,
          approvedAt: new Date()
        }
      });

      // Terminate requisition
      await tx.jobRequisition.update({
        where: { id: requisitionId },
        data: { status: "REJECTED" }
      });

      // Reset vacancy status to draft
      if (requisition) {
          await tx.vacancy.update({
              where: { id: requisition.vacancyId },
              data: { status: "draft" as any }
          });
      }

      // Notify requester
      await createNotification({
        userId: requisition.requestedById,
        type: "system",
        title: "Requisition Rejected",
        message: `Your job requisition was rejected. Reason: ${comment}`,
        link: "/dashboard/requisitions",
      });

      return { success: true };
    } catch (error: any) {
      console.error("rejectRequisition Error:", error);
      throw error;
    }
  });
}
