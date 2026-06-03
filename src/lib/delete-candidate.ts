import type { PrismaClient } from "@prisma/client";

/** Shared cascade delete for a candidate user and all applications. */
export async function deleteApplicationChain(
  prisma: PrismaClient,
  applicationId: string,
) {
  await prisma.referenceCheckShare.deleteMany({ where: { applicationId } });
  await prisma.referenceCheck.deleteMany({ where: { candidateId: applicationId } });

  const assessments = await prisma.assessment.findMany({
    where: { applicationId },
    select: { id: true },
  });
  for (const a of assessments) {
    await prisma.assessmentLink.deleteMany({ where: { assessmentId: a.id } });
  }
  await prisma.assessment.deleteMany({ where: { applicationId } });

  const interviews = await prisma.interview.findMany({
    where: { applicationId },
    select: { id: true },
  });
  for (const interview of interviews) {
    await prisma.interviewFeedback.deleteMany({
      where: { interviewId: interview.id },
    });
  }
  await prisma.interview.deleteMany({ where: { applicationId } });

  await prisma.candidateNote.deleteMany({ where: { applicationId } });
  await prisma.interviewComment.deleteMany({ where: { applicationId } });
  await prisma.pipelineStage.deleteMany({ where: { applicationId } });
  await prisma.document.deleteMany({ where: { applicationId } });
  await prisma.applicationCustomField.deleteMany({ where: { applicationId } });
  await prisma.candidateScore.deleteMany({ where: { applicationId } });

  const offer = await prisma.offer.findUnique({ where: { applicationId } });
  if (offer) {
    await prisma.contract.deleteMany({ where: { offerId: offer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
  }

  await prisma.activityLog.deleteMany({ where: { resourceId: applicationId } });
  await prisma.application.delete({ where: { id: applicationId } });
}

export async function deleteEmployeeChain(
  prisma: PrismaClient,
  userId: string,
) {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) return;

  const employeeId = employee.id;
  const probation = await prisma.probationRecord.findUnique({
    where: { employeeId },
  });
  if (probation) {
    await prisma.probationEvaluation.deleteMany({
      where: { probationRecordId: probation.id },
    });
    await prisma.probationExtension.deleteMany({
      where: { probationRecordId: probation.id },
    });
    await prisma.probationRecord.delete({ where: { id: probation.id } });
  }

  await prisma.memoHire.deleteMany({ where: { employeeId } });
  await prisma.employeeContract.deleteMany({ where: { employeeId } });
  await prisma.employeeDocument.deleteMany({ where: { employeeId } });
  await prisma.employeeAsset.deleteMany({ where: { employeeId } });
  await prisma.onboarding.deleteMany({ where: { employeeId } });
  await prisma.employee.delete({ where: { id: employeeId } });
}

export async function deleteCandidateUser(
  prisma: PrismaClient,
  userId: string,
) {
  const applications = await prisma.application.findMany({
    where: { candidateId: userId },
    select: { id: true },
  });

  for (const app of applications) {
    await deleteApplicationChain(prisma, app.id);
  }

  await prisma.onboardingTask.deleteMany({ where: { employeeId: userId } });
  await deleteEmployeeChain(prisma, userId);
  await prisma.candidateProfile.deleteMany({ where: { userId } });
  await prisma.activityLog.deleteMany({
    where: { OR: [{ userId }, { resourceId: userId }] },
  });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

export async function deleteCandidatesByEmails(
  prisma: PrismaClient,
  emails: string[],
  options?: { execute?: boolean },
) {
  const execute = options?.execute ?? false;
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  const users = await prisma.user.findMany({
    where: { email: { in: normalized, mode: "insensitive" } },
    include: {
      applications: {
        include: { vacancy: { select: { title: true } } },
      },
      employeeRecord: {
        select: { id: true, employeeCode: true, position: true },
      },
      userRoles: { include: { role: { select: { slug: true } } } },
    },
  });

  const adminLike = users.filter((u) =>
    u.userRoles.some((ur) =>
      ["admin", "super_admin"].includes(ur.role.slug),
    ),
  );
  if (adminLike.length) {
    throw new Error(
      `Cannot delete admin users: ${adminLike.map((u) => u.email).join(", ")}`,
    );
  }

  if (!execute) {
    return { dryRun: true, users, deleted: [] as { id: string; email: string; name: string }[] };
  }

  const deleted: { id: string; email: string; name: string }[] = [];
  await prisma.$transaction(
    async () => {
      for (const u of users) {
        await deleteCandidateUser(prisma, u.id);
        deleted.push({ id: u.id, email: u.email, name: u.name });
      }
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  return { dryRun: false, users, deleted };
}
