import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const now = new Date();

  const [users, applicationsDb, departments, pendingConfirmations] = await Promise.all([
    prisma.user.findMany({
      where: { onboardingTasks: { some: {} } },
      include: {
        department: true,
        employeeRecord: {
          include: { employeeContract: true }
        },
        onboardingTasks: { orderBy: { priority: "asc" } },
        applications: {
          where: { currentStage: { in: ["hired", "onboarding"] } },
          include: { vacancy: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Show candidates in offer, hired, OR onboarding stage for the dropdown
    prisma.application.findMany({
      where: { currentStage: { in: ["offer", "hired", "onboarding"] } },
      include: { candidate: true, vacancy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.onboarding.findMany({
      where: {
        onboardingStatus: { in: ["document_collection", "new_hire_confirmation"] },
        employee: {
          employeeContract: {
            is: null,
          },
        },
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const onboardings = users.map((u) => {
    const total = u.onboardingTasks.length;
    const completed = u.onboardingTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let status = "Pending";
    if (progress === 100) status = "Completed";
    else if (progress > 0) status = "In Progress";

    const overdueTasks = u.onboardingTasks.filter(
      (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now,
    ).length;

    return {
      id: u.id,
      candidateName: u.name,
      position: u.applications[0]?.vacancy.title ?? "New Employee",
      department: u.department?.name ?? "General",
      startDate: u.createdAt.toISOString(),
      progress,
      status,
      employeeId: u.employeeRecord?.id ?? null,
      contractId: u.employeeRecord?.employeeContract?.id ?? null,
      contractStatus: u.employeeRecord?.employeeContract?.status ?? null,
      tasksCompleted: completed,
      tasksTotal: total,
      overdueTasks,
      tasks: u.onboardingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        notes: t.notes ?? null,
      })),
    };
  });

  const stats = {
    total: onboardings.length,
    completed: onboardings.filter((o) => o.status === "Completed").length,
    inProgress: onboardings.filter((o) => o.status === "In Progress").length,
    overdue: onboardings.reduce((acc, o) => acc + o.overdueTasks, 0),
  };

  const activeApplications = applicationsDb.map((app) => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title,
  }));

  const pendingConfirmationsList = pendingConfirmations.map((o) => ({
    id: o.employee.id,
    candidateName: o.employee.user.name,
    position: o.employee.position,
    department: o.employee.department,
    startDate: o.employee.startDate.toISOString(),
    employmentType: o.employee.employmentType,
    status: o.onboardingStatus,
  }));

  return (
    <OnboardingClient
      onboardings={onboardings}
      stats={stats}
      activeApplications={activeApplications}
      departments={departments}
      pendingConfirmations={pendingConfirmationsList}
    />
  );
}
