import { prisma } from "@/lib/prisma";
import DashboardClient, { DashboardMetrics } from "./DashboardClient";
import { formatDate } from "@/lib/utils";
import { checkRole } from "@/lib/rbac";
import { unstable_cache } from "next/cache";

const getDashboardMetrics = unstable_cache(
  async (): Promise<DashboardMetrics> => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── Run ALL independent DB queries in parallel ──────────────────────────
    const [
      activeVacancies,
      totalVacancies,
      totalCandidates,
      newCandidatesThisMonth,
      offers,
      scores,
      pipelineGroups,
      sourceGroups,
      monthlyApps,
      hiredApplications,
      vacanciesForCost,
      allScores,
      activities,
      topApps,
      interviews,
      newVacancies30d,
      newOffers30d,
      interviewedGroups,
      hiredBySource,
    ] = await Promise.all([
      prisma.vacancy.count({ where: { status: "published" } }),
      prisma.vacancy.count(),
      prisma.application.count(),
      prisma.application.count({ where: { appliedAt: { gte: oneMonthAgo } } }),
      prisma.offer.findMany({ select: { status: true } }),
      prisma.candidateScore.aggregate({ _avg: { overallScore: true } }),
      prisma.application.groupBy({ by: ["currentStage"], _count: true }),
      prisma.application.groupBy({ by: ["source"], _count: true }),
      prisma.application.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, currentStage: true },
      }),
      prisma.application.findMany({
        where: { currentStage: "hired" },
        select: {
          createdAt: true,
          updatedAt: true,
          source: true,
          appliedAt: true,
          rejectedAt: true,
          offer: { select: { status: true, respondedAt: true } },
        },
      }),
      prisma.vacancy.findMany({
        where: { status: "published" },
        select: { salaryMin: true, salaryMax: true },
      }),
      prisma.candidateScore.findMany({ select: { overallScore: true } }),
      prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      }),
      prisma.application.findMany({
        where: { candidateScore: { isNot: null } },
        include: { candidate: true, vacancy: true, candidateScore: true },
        orderBy: { candidateScore: { overallScore: "desc" } },
        take: 4,
      }),
      prisma.interview.findMany({
        where: {
          status: { in: ["scheduled", "confirmed"] },
          // Include from 24 hours ago to handle timezone edge cases where a
          // server UTC "now" might fall slightly ahead of WIB-based entries.
          scheduledAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        include: {
          application: { include: { candidate: true, vacancy: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      prisma.vacancy.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.offer.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Count apps that had at least one non-cancelled interview (for yield ratio)
      prisma.interview.groupBy({
        by: ["applicationId"],
        where: { status: { not: "cancelled" } },
      }),
      // Channel cost lookup (for channel effectiveness)
      prisma.application.groupBy({
        by: ["source"],
        where: { currentStage: "hired" },
        _count: true,
      }),
    ]);

    // ── Secondary query (depends on activities result) ──────────────────────
    const resourceIds = activities
      .map((a) => a.resourceId)
      .filter((id) => id !== null) as string[];
    const relatedApps = await prisma.application.findMany({
      where: {
        OR: [{ id: { in: resourceIds } }, { candidateId: { in: resourceIds } }],
      },
      include: { candidate: true, vacancy: true },
    });

    // ── Compute derived values ──────────────────────────────────────────────

    // Offer acceptance rate
    const acceptedOffers = offers.filter((o) => o.status === "accepted").length;
    const offerAcceptanceRate =
      offers.length > 0
        ? Math.round((acceptedOffers / offers.length) * 100)
        : 0;

    // Average AI match score
    const averageMatchScore = Math.round(scores._avg.overallScore || 0);

    // Pipeline funnel
    const standardStages = [
      "applied",
      "screening",
      "hr_interview",
      "user_interview",
      "final_interview",
      "offer",
      "hired",
    ];
    const stageMap: Record<string, string> = {
      applied: "Applied",
      screening: "Screening",
      hr_interview: "HR Interview",
      user_interview: "User Interview",
      final_interview: "Final Interview",
      offer: "Offer",
      hired: "Hired",
    };
    const pipelineFunnel = standardStages.map((stage) => {
      const found = pipelineGroups.find((p) => p.currentStage === stage);
      return { stage: stageMap[stage] || stage, count: found?._count || 0 };
    });

    // Candidate sources
    const totalSources = sourceGroups.reduce(
      (acc, curr) => acc + curr._count,
      0,
    );
    const candidateSourceBreakdown = sourceGroups
      .map((s) => ({
        source: s.source.charAt(0).toUpperCase() + s.source.slice(1),
        count: s._count,
        percentage:
          totalSources > 0 ? Math.round((s._count / totalSources) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly trend
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyDataMap: Record<
      string,
      { month: string; applications: number; hires: number }
    > = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = months[d.getMonth()];
      monthlyDataMap[mName] = { month: mName, applications: 0, hires: 0 };
    }
    monthlyApps.forEach((app) => {
      const mName = months[app.createdAt.getMonth()];
      if (monthlyDataMap[mName]) {
        monthlyDataMap[mName].applications++;
        if (app.currentStage === "hired") monthlyDataMap[mName].hires++;
      }
    });
    const monthlyApplicationsTrend = Object.values(monthlyDataMap).reverse();

    // Average time to hire
    let totalDays = 0;
    hiredApplications.forEach((app) => {
      const diffTime = Math.abs(
        app.updatedAt.getTime() - app.createdAt.getTime(),
      );
      totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
    const totalHires = hiredApplications.length;
    const averageTimeToHire =
      totalHires > 0 ? Math.round(totalDays / totalHires) : 0;

    // Average cost per hire
    const avgSalary =
      vacanciesForCost.reduce(
        (acc, v) => acc + ((v.salaryMin || 0) + (v.salaryMax || 0)) / 2,
        0,
      ) / (vacanciesForCost.length || 1);
    const averageCostPerHire =
      totalHires > 0 ? Math.round(avgSalary * 0.15) : 0;

    // ── NEW METRICS ────────────────────────────────────────────────────────────
    const totalHiresCount = hiredApplications.length;

    // M2/M3/M4: Sourcing rates
    const referralHires = hiredApplications.filter(
      (a) => a.source?.toLowerCase() === "referral",
    ).length;
    const linkedinHires = hiredApplications.filter(
      (a) => a.source?.toLowerCase() === "linkedin",
    ).length;
    const jobstreetHires = hiredApplications.filter(
      (a) => a.source?.toLowerCase() === "jobstreet",
    ).length;
    const referralRate =
      totalHiresCount > 0
        ? Math.round((referralHires / totalHiresCount) * 100)
        : 0;
    const linkedinRate =
      totalHiresCount > 0
        ? Math.round((linkedinHires / totalHiresCount) * 100)
        : 0;
    const jobstreetRate =
      totalHiresCount > 0
        ? Math.round((jobstreetHires / totalHiresCount) * 100)
        : 0;

    // M5: Channel Effectiveness — hires per channel with estimated cost
    const CHANNEL_COST_IDR: Record<string, number> = {
      referral: 0,
      direct: 0,
      internal: 0,
      linkedin: 5_000_000,
      jobstreet: 3_000_000,
      loker_bali: 1_000_000,
      other: 500_000,
    };
    const channelEffectiveness = hiredBySource
      .map((row) => {
        const src = (row.source || "direct").toLowerCase();
        const count = row._count;
        const costPerHire = CHANNEL_COST_IDR[src] ?? CHANNEL_COST_IDR.other;
        const totalCost = count * costPerHire;
        return {
          channel:
            src.charAt(0).toUpperCase() + src.slice(1).replace(/_/g, " "),
          hires: count,
          costPerHire,
          totalCost,
        };
      })
      .sort((a, b) => b.hires - a.hires);

    // M6: Yield Ratio — hires / uniquely-interviewed × 100
    const interviewedCount = interviewedGroups.length;
    const yieldRatio =
      interviewedCount > 0
        ? Math.round((totalHiresCount / interviewedCount) * 100)
        : 0;

    // M7: Time-to-Fill — appliedAt → offer.respondedAt
    const ttfDays = hiredApplications
      .filter((a) => a.offer?.status === "accepted" && a.offer?.respondedAt)
      .map((a) => {
        const start = a.appliedAt ?? a.createdAt;
        const end = a.offer!.respondedAt!;
        return Math.round(
          Math.abs(end.getTime() - start.getTime()) / 86_400_000,
        );
      })
      .filter((d) => d > 0 && d < 500);
    const avgTimeToFill =
      ttfDays.length > 0
        ? Math.round(ttfDays.reduce((a, b) => a + b, 0) / ttfDays.length)
        : 0;

    // M12: 90-Day Retention
    const cutoff90 = new Date(now.getTime() - 90 * 86_400_000);
    const hires90 = hiredApplications.filter((a) => {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return hiredAt < cutoff90;
    });
    const retained90 = hires90.filter((a) => {
      if (a.rejectedAt) {
        const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
        return a.rejectedAt < hiredAt;
      }
      return true;
    });
    const retention90Days =
      hires90.length > 0
        ? Math.round((retained90.length / hires90.length) * 100)
        : 0;

    // M13: Quality of Hire — 6-month retention
    const cutoff180 = new Date(now.getTime() - 180 * 86_400_000);
    const hires180 = hiredApplications.filter((a) => {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return hiredAt < cutoff180;
    });
    const retained180 = hires180.filter((a) => {
      if (a.rejectedAt) {
        const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
        return a.rejectedAt < hiredAt;
      }
      return true;
    });
    const qualityOfHire =
      hires180.length > 0
        ? Math.round((retained180.length / hires180.length) * 100)
        : 0;

    // Match score distribution
    let range90_100 = 0,
      range80_89 = 0,
      range70_79 = 0,
      range60_69 = 0,
      range50_59 = 0,
      below50 = 0;
    allScores.forEach((s) => {
      const sc = s.overallScore;
      if (sc >= 90) range90_100++;
      else if (sc >= 80) range80_89++;
      else if (sc >= 70) range70_79++;
      else if (sc >= 60) range60_69++;
      else if (sc >= 50) range50_59++;
      else below50++;
    });
    const matchScoreDistribution = [
      { range: "90-100", count: range90_100 },
      { range: "80-89", count: range80_89 },
      { range: "70-79", count: range70_79 },
      { range: "60-69", count: range60_69 },
      { range: "50-59", count: range50_59 },
      { range: "Below 50", count: below50 },
    ];

    // Recent activity
    const recentActivity = activities.map((a) => {
      const app = relatedApps.find(
        (app) => app.id === a.resourceId || app.candidateId === a.resourceId,
      );
      return {
        id: a.id,
        type: a.resource.toLowerCase(),
        action: a.action,
        resource: app
          ? `${app.candidate.name} (${app.vacancy.title})`
          : a.user?.name || a.resourceId || a.resource,
        time: formatDate(a.createdAt),
      };
    });

    // Top candidates
    const topCandidates = topApps.map((app) => ({
      id: app.id,
      name: app.candidate.name,
      vacancyTitle: app.vacancy.title,
      score: app.candidateScore?.overallScore || 0,
    }));

    // Upcoming interviews
    const upcomingInterviews = interviews.map((i) => ({
      id: i.id,
      candidateName: i.application.candidate.name,
      position: i.application.vacancy.title,
      type: i.type.charAt(0).toUpperCase() + i.type.slice(1),
      status: i.status,
      scheduledAt: i.scheduledAt.toISOString(),
      location: i.location || "Remote",
    }));

    const changes = {
      vacancies: `+${newVacancies30d}`,
      candidates: `+${newCandidatesThisMonth}`,
      timeToHire: hiredApplications.length > 0 ? "-0" : "+0",
      offerRate: newOffers30d > 0 ? `+${newOffers30d}` : "+0",
      aiScore: "+0%",
      costPerHire: "+Rp 0",
    };

    return {
      activeVacancies,
      totalVacancies,
      totalCandidates,
      newCandidatesThisMonth,
      averageTimeToHire,
      offerAcceptanceRate,
      averageMatchScore,
      averageCostPerHire,
      pipelineFunnel,
      candidateSourceBreakdown,
      monthlyApplications: monthlyApplicationsTrend,
      matchScoreDistribution,
      recentActivity,
      topCandidates,
      upcomingInterviews,
      changes,
      referralRate,
      linkedinRate,
      jobstreetRate,
      channelEffectiveness,
      yieldRatio,
      avgTimeToFill,
      retention90Days,
      qualityOfHire,
    };
  },
  ["dashboard-metrics"],
  { revalidate: 30, tags: ["dashboard", "interviews"] },
);

export default async function DashboardPage() {
  await checkRole([
    "admin",
    "hr",
    "recruiter",
    "interviewer",
    "finance",
    "manager",
  ]);
  const metrics = await getDashboardMetrics();
  return <DashboardClient metrics={metrics} />;
}
