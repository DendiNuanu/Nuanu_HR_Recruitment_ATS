import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const now = new Date();

  const [users, applicationsDb, departments] = await Promise.all([
    prisma.user.findMany({
      where: { onboardingTasks: { some: {} } },
      include: {
        department: true,
        onboardingTasks: { orderBy: { priority: "asc" } },
        applications: {
          where: { currentStage: "hired" },
          include: { vacancy: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany({
      where: { currentStage: { in: ["offer", "hired"] } },
      include: { candidate: true, vacancy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
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

  return (
    <OnboardingClient
      onboardings={onboardings}
      stats={stats}
      activeApplications={activeApplications}
      departments={departments}
    />
  );
}
