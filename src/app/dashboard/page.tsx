import { prisma } from "@/lib/prisma";
import DashboardClient, { DashboardMetrics } from "./DashboardClient";
import { formatDate } from "@/lib/utils";
import { checkRole } from "@/lib/rbac";
import {
  formatSourceLabel,
  getChannelCost,
  normalizeSourceKey,
} from "@/lib/recruitment-sources";

export const dynamic = "force-dynamic";

const ACTIVE_APP_WHERE = { deletedAt: null } as const;

async function getDashboardMetrics(): Promise<DashboardMetrics> {
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
      topApps,
      interviews,
      newVacancies30d,
      newOffers30d,
      interviewedGroups,
      hiredBySource,
    ] = await Promise.all([
      prisma.vacancy.count({ where: { status: "published" } }),
      prisma.vacancy.count(),
      prisma.application.count({ where: ACTIVE_APP_WHERE }),
      prisma.application.count({
        where: { ...ACTIVE_APP_WHERE, appliedAt: { gte: oneMonthAgo } },
      }),
      prisma.offer.findMany({ select: { status: true } }),
      prisma.candidateScore.aggregate({
        where: { application: ACTIVE_APP_WHERE },
        _avg: { overallScore: true },
      }),
      prisma.application.groupBy({
        by: ["currentStage"],
        where: ACTIVE_APP_WHERE,
        _count: true,
      }),
      prisma.application.groupBy({
        by: ["source"],
        where: ACTIVE_APP_WHERE,
        _count: true,
      }),
      prisma.application.findMany({
        where: { ...ACTIVE_APP_WHERE, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, currentStage: true },
      }),
      prisma.application.findMany({
        where: { ...ACTIVE_APP_WHERE, currentStage: "hired" },
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
      prisma.candidateScore.findMany({
        where: { application: ACTIVE_APP_WHERE },
        select: { overallScore: true },
      }),
      prisma.application.findMany({
        where: { ...ACTIVE_APP_WHERE, candidateScore: { isNot: null } },
        include: { candidate: true, vacancy: true, candidateScore: true },
        orderBy: { candidateScore: { overallScore: "desc" } },
        take: 4,
      }),
      prisma.interview.findMany({
        where: {
          status: { in: ["scheduled", "confirmed"] },
          application: ACTIVE_APP_WHERE,
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
        where: {
          status: { not: "cancelled" },
          application: ACTIVE_APP_WHERE,
        },
      }),
      // Channel cost lookup (for channel effectiveness)
      prisma.application.groupBy({
        by: ["source"],
        where: { ...ACTIVE_APP_WHERE, currentStage: "hired" },
        _count: true,
      }),
    ]);

    const activeApplications = await prisma.application.findMany({
      where: ACTIVE_APP_WHERE,
      select: { id: true, candidateId: true },
    });
    const activeAppIds = activeApplications.map((a) => a.id);
    const activeCandidateIds = [
      ...new Set(activeApplications.map((a) => a.candidateId)),
    ];

    const activities =
      activeAppIds.length > 0
        ? await prisma.activityLog.findMany({
            where: {
              OR: [
                { resourceId: { in: activeAppIds } },
                {
                  resourceId: { in: activeCandidateIds },
                  userId: { in: activeCandidateIds },
                },
              ],
            },
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { user: true },
          })
        : [];

    const candidateProfiles =
      activeCandidateIds.length > 0
        ? await prisma.candidateProfile.findMany({
            where: {
              userId: { in: activeCandidateIds },
            },
            select: { location: true, gender: true, dateOfBirth: true },
          })
        : [];

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
    const mergedSources = new Map<string, number>();
    for (const s of sourceGroups) {
      const key = normalizeSourceKey(s.source);
      if (!key) continue;
      mergedSources.set(key, (mergedSources.get(key) ?? 0) + s._count);
    }
    const mergedTotal = Array.from(mergedSources.values()).reduce(
      (a, b) => a + b,
      0,
    );
    const candidateSourceBreakdown = Array.from(mergedSources.entries())
      .map(([key, count]) => ({
        source: formatSourceLabel(key),
        count,
        percentage:
          mergedTotal > 0 ? Math.round((count / mergedTotal) * 100) : 0,
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
    const seekHires = hiredApplications.filter(
      (a) => normalizeSourceKey(a.source) === "seek",
    ).length;
    const referralRate =
      totalHiresCount > 0
        ? Math.round((referralHires / totalHiresCount) * 100)
        : 0;
    const linkedinRate =
      totalHiresCount > 0
        ? Math.round((linkedinHires / totalHiresCount) * 100)
        : 0;
    const seekRate =
      totalHiresCount > 0
        ? Math.round((seekHires / totalHiresCount) * 100)
        : 0;

    // M5: Channel Effectiveness — hires per channel with estimated cost
    const mergedHiredBySource = new Map<string, number>();
    for (const row of hiredBySource) {
      const key = normalizeSourceKey(row.source);
      if (!key) continue;
      mergedHiredBySource.set(key, (mergedHiredBySource.get(key) ?? 0) + row._count);
    }
    const channelEffectiveness = Array.from(mergedHiredBySource.entries())
      .map(([src, count]) => {
        const costPerHire = getChannelCost(src);
        const totalCost = count * costPerHire;
        return {
          channel: formatSourceLabel(src),
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

    // M2/M3/M4: Quarterly sourcing rates (per 3 months)
    function quarterOf(d: Date) {
      return Math.floor(d.getMonth() / 3) + 1;
    }
    const currentYear = now.getFullYear();
    const quarterlyRates = [1, 2, 3, 4].map((q) => {
      const qHires = hiredApplications.filter((a) => {
        const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
        return (
          hiredAt.getFullYear() === currentYear && quarterOf(hiredAt) === q
        );
      });
      const qTotal = qHires.length;
      return {
        quarter: `Q${q}`,
        totalHires: qTotal,
        referral:
          qTotal > 0
            ? Math.round(
                (qHires.filter((a) => a.source?.toLowerCase() === "referral")
                  .length /
                  qTotal) *
                  100,
              )
            : 0,
        linkedin:
          qTotal > 0
            ? Math.round(
                (qHires.filter((a) => a.source?.toLowerCase() === "linkedin")
                  .length /
                  qTotal) *
                  100,
              )
            : 0,
        seek:
          qTotal > 0
            ? Math.round(
                (qHires.filter((a) => normalizeSourceKey(a.source) === "seek")
                  .length /
                  qTotal) *
                  100,
              )
            : 0,
      };
    });

    // M9: Diversity — Domicile, Gender, Age
    const locMap = new Map<string, number>();
    const genderMap = new Map<string, number>();
    const ageMap = new Map<string, number>();
    const ageOrder = ["Under 25", "25-34", "35-44", "45-54", "55+"];
    for (const p of candidateProfiles) {
      // Domicile
      const loc = (p.location ?? "Unknown").trim();
      locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
      // Gender
      const g = (p.gender ?? "").toLowerCase();
      const gLabel =
        g === "male"
          ? "Male"
          : g === "female"
            ? "Female"
            : g === "other"
              ? "Other"
              : "Not Specified";
      genderMap.set(gLabel, (genderMap.get(gLabel) ?? 0) + 1);
      // Age
      if (p.dateOfBirth) {
        const ageYears =
          (now.getTime() - new Date(p.dateOfBirth).getTime()) /
          (365.25 * 86_400_000);
        const ag =
          ageYears < 25
            ? "Under 25"
            : ageYears < 35
              ? "25-34"
              : ageYears < 45
                ? "35-44"
                : ageYears < 55
                  ? "45-54"
                  : "55+";
        ageMap.set(ag, (ageMap.get(ag) ?? 0) + 1);
      }
    }
    const totalProfiles = candidateProfiles.length || 1;
    const domicileBreakdown = Array.from(locMap.entries())
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / totalProfiles) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const totalGender =
      Array.from(genderMap.values()).reduce((a, b) => a + b, 0) || 1;
    const genderBreakdown = Array.from(genderMap.entries())
      .map(([gender, count]) => ({
        gender,
        count,
        percentage: Math.round((count / totalGender) * 100),
      }))
      .sort((a, b) => b.count - a.count);
    const totalAge =
      Array.from(ageMap.values()).reduce((a, b) => a + b, 0) || 1;
    const ageBreakdown = ageOrder
      .filter((g) => ageMap.has(g))
      .map((group) => ({
        group,
        count: ageMap.get(group) ?? 0,
        percentage: Math.round(((ageMap.get(group) ?? 0) / totalAge) * 100),
      }));

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

    // Recent activity — only entries tied to current applications (live DB data)
    const recentActivity = activities
      .map((a) => {
        const app = relatedApps.find(
          (app) => app.id === a.resourceId || app.candidateId === a.resourceId,
        );
        if (!app) return null;
        return {
          id: a.id,
          type: a.resource.toLowerCase(),
          action: a.action,
          resource: `${app.candidate.name} (${app.vacancy.title})`,
          time: formatDate(a.createdAt),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

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
      seekRate,
      quarterlyRates,
      channelEffectiveness,
      yieldRatio,
      avgTimeToFill,
      retention90Days,
      qualityOfHire,
      domicileBreakdown,
      genderBreakdown,
      ageBreakdown,
    };
}

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
