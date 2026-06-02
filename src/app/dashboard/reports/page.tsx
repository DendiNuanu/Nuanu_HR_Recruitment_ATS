import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(`${year}-01-01`);

  const [applications, interviews, offers, vacancies] = await Promise.all([
    prisma.application.findMany({
      where: { deletedAt: null, createdAt: { gte: startOfYear } },
      select: {
        id: true,
        currentStage: true,
        status: true,
        source: true,
        createdAt: true,
        vacancyId: true,
        vacancy: {
          select: { title: true, department: { select: { name: true } } },
        },
      },
    }),
    prisma.interview.findMany({
      where: { scheduledAt: { gte: startOfYear } },
      include: {
        interviewer: { select: { name: true } },
        feedback: { select: { overallRating: true } },
      },
    }),
    prisma.offer.findMany({
      where: { createdAt: { gte: startOfYear } },
      select: { status: true, sentAt: true, respondedAt: true, salary: true },
    }),
    prisma.vacancy.findMany({
      where: { deletedAt: null },
      select: {
        title: true,
        headcount: true,
        filledCount: true,
        status: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  // Monthly summary
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(year, i, 1);
    const label = m.toLocaleString("en-US", { month: "short" });
    const apps = applications.filter(
      (a) => a.createdAt.getMonth() === i,
    ).length;
    const ivs = interviews.filter(
      (iv) => iv.scheduledAt.getMonth() === i,
    ).length;
    const hires = applications.filter(
      (a) =>
        (a.currentStage === "hired" || a.status === "hired") &&
        a.createdAt.getMonth() === i,
    ).length;
    const ofrs = offers.filter(
      (o) => o.sentAt && new Date(o.sentAt).getMonth() === i,
    ).length;
    return {
      month: label,
      applications: apps,
      interviews: ivs,
      hires,
      offers: ofrs,
    };
  });

  // Pipeline stage report
  const stageMap = new Map<string, number>();
  for (const a of applications) {
    stageMap.set(a.currentStage, (stageMap.get(a.currentStage) ?? 0) + 1);
  }
  const stageReport = Array.from(stageMap.entries())
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);

  // Channel performance
  const channelMap = new Map<string, { applications: number; hires: number }>();
  for (const a of applications) {
    const src = (a.source || "direct").toLowerCase();
    const e = channelMap.get(src) ?? { applications: 0, hires: 0 };
    e.applications++;
    if (a.currentStage === "hired" || a.status === "hired") e.hires++;
    channelMap.set(src, e);
  }
  const channelReport = Array.from(channelMap.entries())
    .map(([channel, d]) => ({
      channel,
      ...d,
      conversionRate:
        d.applications > 0 ? Math.round((d.hires / d.applications) * 100) : 0,
    }))
    .sort((a, b) => b.applications - a.applications);

  // Interviewer performance
  const interviewerMap = new Map<
    string,
    { count: number; totalRating: number; ratingCount: number }
  >();
  for (const iv of interviews) {
    const name = iv.interviewer.name;
    const e = interviewerMap.get(name) ?? {
      count: 0,
      totalRating: 0,
      ratingCount: 0,
    };
    e.count++;
    for (const f of iv.feedback) {
      e.totalRating += f.overallRating;
      e.ratingCount++;
    }
    interviewerMap.set(name, e);
  }
  const interviewerReport = Array.from(interviewerMap.entries())
    .map(([name, d]) => ({
      name,
      interviews: d.count,
      avgRating:
        d.ratingCount > 0
          ? Math.round((d.totalRating / d.ratingCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.interviews - a.interviews);

  // Headcount report
  const deptMap = new Map<
    string,
    { open: number; filled: number; total: number }
  >();
  for (const v of vacancies) {
    const dept = v.department?.name ?? "Unknown";
    const e = deptMap.get(dept) ?? { open: 0, filled: 0, total: 0 };
    e.total += v.headcount;
    e.filled += v.filledCount;
    e.open += Math.max(0, v.headcount - v.filledCount);
    deptMap.set(dept, e);
  }
  const headcountReport = Array.from(deptMap.entries())
    .map(([dept, d]) => ({ dept, ...d }))
    .sort((a, b) => b.total - a.total);

  return (
    <ReportsClient
      year={year}
      monthlySummary={months}
      stageReport={stageReport}
      channelReport={channelReport}
      interviewerReport={interviewerReport}
      headcountReport={headcountReport}
    />
  );
}
