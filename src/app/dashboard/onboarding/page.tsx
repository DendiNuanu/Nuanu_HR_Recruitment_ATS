import { prisma } from "@/lib/prisma";
import OnboardingClient, { OnboardingData } from "./OnboardingClient";

export default async function OnboardingPage() {
  // Mock OnboardingData from employees (Users) for demonstration, 
  // normally this would tie to a true Employee/Onboarding table
  const users = await prisma.user.findMany({
    where: {
      onboardingTasks: {
        some: {}
      }
    },
    include: {
      department: true,
      onboardingTasks: true,
    },
    orderBy: { createdAt: "desc" }
  });


  const onboardings: OnboardingData[] = users.map(u => {
    const total = u.onboardingTasks.length;
    const completed = u.onboardingTasks.filter(t => t.status === "completed").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    let status = "Pending";
    if (progress === 100) status = "Completed";
    else if (progress > 0) status = "In Progress";

    return {
      id: u.id,
      candidateName: u.name,
      position: "Employee", // Fallback, real system would link back to application/vacancy
      department: u.department?.name || "General",
      startDate: u.createdAt,
      progress,
      status,
      tasksCompleted: completed,
      tasksTotal: total,
    };
  });

  // Since we only have mock users in this DB view, let's create a realistic mock stats if none exist
  const stats = {
    completed: onboardings.filter(o => o.status === "Completed").length,
    inProgress: onboardings.filter(o => o.status === "In Progress").length,
    overdue: 0,
  };

  const applicationsDb = await prisma.application.findMany({
    where: { currentStage: { in: ["offer", "hired"] } },
    include: { candidate: true, vacancy: true },
    orderBy: { createdAt: "desc" }
  });

  const activeApplications = applicationsDb.map(app => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title
  }));

  const departments = await prisma.department.findMany({
    select: { id: true, name: true }
  });

  return <OnboardingClient onboardings={onboardings} stats={stats} activeApplications={activeApplications} departments={departments} />;
}
