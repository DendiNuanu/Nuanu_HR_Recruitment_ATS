import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function createRequisition(
  vacancyId: string,
  requestedById: string,
) {
  // Run the DB mutations inside the transaction; collect notification target to fire after.
  const { requisition, notifyUserId } = await prisma.$transaction(
    async (tx) => {
      // 1. Create JobRequisition
      const requisition = await tx.jobRequisition.create({
        data: {
          vacancyId,
          requestedById,
          status: "DRAFT",
          currentStep: 1,
        },
      });

      // 2. Parallelize all user lookups at once
      const [admin, managerUser, hrUser, financeUser] = await Promise.all([
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "super-admin" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "manager" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "hr" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "finance" } } } },
        }),
      ]);

      if (!admin) throw new Error("No admin user found for approval fallback.");

      const managerId = managerUser?.id ?? admin.id;
      const hrId = hrUser?.id ?? admin.id;
      const financeId = financeUser?.id ?? admin.id;

      // 3. Create all three approval records in a single round-trip
      await tx.approval.createMany({
        data: [
          {
            requisitionId: requisition.id,
            approverId: managerId,
            role: "MANAGER",
            status: "PENDING",
          },
          {
            requisitionId: requisition.id,
            approverId: hrId,
            role: "HR",
            status: "PENDING",
          },
          {
            requisitionId: requisition.id,
            approverId: financeId,
            role: "FINANCE",
            status: "PENDING",
          },
        ],
      });

      // 4. Update Vacancy status
      await tx.vacancy.update({
        where: { id: vacancyId },
        data: { status: "pending_approval" as any },
      });

      return { requisition, notifyUserId: managerId };
    },
    { timeout: 15000 },
  );

  // Fire notification OUTSIDE the transaction so a slow socket import never
  // causes the transaction to time out. Failures are silently logged.
  createNotification({
    userId: notifyUserId,
    type: "system",
    title: "New Job Requisition",
    message: "A new job vacancy requires your approval.",
    link: "/dashboard/requisitions",
  }).catch(console.error);

  return requisition;
}

export async function createRequisitionWithVacancy(data: {
  title: string;
  departmentId: string;
  creatorId: string;
  positionLevel: string;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  justificationType: string;
  replacing?: string;
  businessNeed: string;
  responsibilities: string[];
  education: string;
  experienceYears: number;
  requiredSkills: string[];
  certifications?: string;
}) {
  const { requisition, notifyUserId } = await prisma.$transaction(
    async (tx) => {
      // 1. Create Vacancy
      const vacancy = await tx.vacancy.create({
        data: {
          title: data.title,
          code: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
          departmentId: data.departmentId,
          creatorId: data.creatorId,
          status: "pending_approval",
          employmentType: data.employmentType.toLowerCase(),
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          experienceMin: data.experienceYears,
          educationLevel: data.education,
          skills: data.requiredSkills,
          responsibilities: data.responsibilities.join("\n"),
          requirements: `Justification: ${data.justificationType}${data.replacing ? ` (Replacing ${data.replacing})` : ""}\n\nBusiness Need: ${data.businessNeed}\n\nCertifications: ${data.certifications || "None"}`,
        },
      });

      // 2. Create JobRequisition
      const requisition = await tx.jobRequisition.create({
        data: {
          vacancyId: vacancy.id,
          requestedById: data.creatorId,
          status: "DRAFT",
          currentStep: 1,
        },
      });

      // 3. Parallelize all user lookups at once
      const [admin, managerUser, hrUser, financeUser] = await Promise.all([
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "super-admin" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "manager" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "hr" } } } },
        }),
        tx.user.findFirst({
          where: { userRoles: { some: { role: { slug: "finance" } } } },
        }),
      ]);

      if (!admin) throw new Error("No admin user found for approval fallback.");

      const managerId = managerUser?.id ?? admin.id;
      const hrId = hrUser?.id ?? admin.id;
      const financeId = financeUser?.id ?? admin.id;

      // 4. Create all three approval records in a single round-trip
      await tx.approval.createMany({
        data: [
          {
            requisitionId: requisition.id,
            approverId: managerId,
            role: "MANAGER",
            status: "PENDING",
          },
          {
            requisitionId: requisition.id,
            approverId: hrId,
            role: "HR",
            status: "PENDING",
          },
          {
            requisitionId: requisition.id,
            approverId: financeId,
            role: "FINANCE",
            status: "PENDING",
          },
        ],
      });

      return { requisition, notifyUserId: managerId };
    },
    { timeout: 15000 },
  );

  // Fire notification OUTSIDE the transaction
  createNotification({
    userId: notifyUserId,
    type: "system",
    title: "New Job Requisition Request",
    message: `New requisition for "${data.title}" requires your approval.`,
    link: "/dashboard/requisitions",
  }).catch(console.error);

  return requisition;
}

export async function approveStep(
  requisitionId: string,
  approverId: string,
  comment?: string,
) {
  type NotificationPayload = Parameters<typeof createNotification>[0];

  const { result, pendingNotification } = await prisma.$transaction(
    async (tx) => {
      // Parallelize the two independent lookups (requisition + approver user)
      const [requisition, user] = await Promise.all([
        tx.jobRequisition.findUnique({
          where: { id: requisitionId },
          include: { approvals: { orderBy: { id: "asc" } } },
        }),
        tx.user.findUnique({
          where: { id: approverId },
          include: { userRoles: { include: { role: true } } },
        }),
      ]);

      if (!requisition) throw new Error("Requisition not found");

      const roleOrder = ["MANAGER", "HR", "FINANCE"];
      const currentRole = roleOrder[requisition.currentStep - 1];
      const isSuperAdmin = user?.userRoles.some(
        (ur) => ur.role.slug === "super-admin",
      );

      const currentApproval = await tx.approval.findFirst({
        where: { requisitionId, role: currentRole, status: "PENDING" },
      });

      if (!currentApproval) {
        throw new Error(
          "This requisition has no pending approval step for the current phase.",
        );
      }

      if (!isSuperAdmin && currentApproval.approverId !== approverId) {
        throw new Error(
          `AUTHORIZED ERROR: This step currently requires approval from ${currentRole}. Please wait for them to approve or login as an Administrator.`,
        );
      }

      // Mark current step approved
      await tx.approval.update({
        where: { id: currentApproval.id },
        data: { status: "APPROVED", comment, approvedAt: new Date() },
      });

      let pendingNotification: NotificationPayload | null = null;

      if (requisition.currentStep < 3) {
        // Advance to next step
        const nextStep = requisition.currentStep + 1;
        await tx.jobRequisition.update({
          where: { id: requisitionId },
          data: { currentStep: nextStep },
        });

        const nextRole = roleOrder[nextStep - 1];
        const nextApproval = await tx.approval.findFirst({
          where: { requisitionId, role: nextRole },
        });

        if (nextApproval) {
          pendingNotification = {
            userId: nextApproval.approverId,
            type: "system",
            title: "Job Requisition Approval Required",
            message: `Requisition approved by ${currentRole}. Your approval is now required.`,
            link: "/dashboard/requisitions",
          };
        }
      } else {
        // Final step — fully approved → mark as Published
        await tx.jobRequisition.update({
          where: { id: requisitionId },
          data: { status: "PUBLISHED" },
        });

        await tx.vacancy.update({
          where: { id: requisition.vacancyId },
          data: { isApproved: true, status: "approved" },
        });

        pendingNotification = {
          userId: requisition.requestedById,
          type: "system",
          title: "Requisition Published",
          message:
            "Your job requisition has been fully approved and is now Published.",
          link: "/dashboard/jobs",
        };
      }

      return { result: { success: true }, pendingNotification };
    },
    { timeout: 15000 },
  );

  // Fire notification OUTSIDE the transaction
  if (pendingNotification) {
    createNotification(pendingNotification).catch(console.error);
  }

  return result;
}

export async function rejectRequisition(
  requisitionId: string,
  approverId: string,
  comment: string,
) {
  const { result, notifyUserId, notifyMessage } = await prisma.$transaction(
    async (tx) => {
      const requisition = await tx.jobRequisition.findUnique({
        where: { id: requisitionId },
      });

      if (!requisition) throw new Error("Requisition not found");

      // Mark current step as rejected
      await tx.approval.updateMany({
        where: { requisitionId, approverId, status: "PENDING" },
        data: { status: "REJECTED", comment, approvedAt: new Date() },
      });

      // Cancel requisition
      await tx.jobRequisition.update({
        where: { id: requisitionId },
        data: { status: "CANCELLED" },
      });

      // Reset vacancy to draft
      await tx.vacancy.update({
        where: { id: requisition.vacancyId },
        data: { status: "draft" as any },
      });

      return {
        result: { success: true },
        notifyUserId: requisition.requestedById,
        notifyMessage: `Your job requisition was cancelled. Reason: ${comment}`,
      };
    },
    { timeout: 15000 },
  );

  // Fire notification OUTSIDE the transaction
  createNotification({
    userId: notifyUserId,
    type: "system",
    title: "Requisition Rejected",
    message: notifyMessage,
    link: "/dashboard/requisitions",
  }).catch(console.error);

  return result;
}
