import { prisma } from "@/lib/prisma";
import AnalyticsClient, { AnalyticsData } from "./AnalyticsClient";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MONTHS = [
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

/** Estimated cost per channel in IDR */
const CHANNEL_COST_IDR: Record<string, number> = {
  referral: 0,
  direct: 0,
  internal: 0,
  linkedin: 5_000_000,
  jobstreet: 3_000_000,
  loker_bali: 1_000_000,
  other: 500_000,
};

function getChannelCost(channel: string): number {
  return CHANNEL_COST_IDR[channel.toLowerCase()] ?? CHANNEL_COST_IDR.other;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.max(
    0,
    Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000),
  );
}

function quarterOf(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function AnalyticsPage() {
  // ── Parallel data fetching ──────────────────
  const [
    allApplications,
    allOffers,
    allInterviews,
    allVacancies,
    allRequisitions,
    allCandidateProfiles,
  ] = await Promise.all([
    prisma.application.findMany({
      select: {
        id: true,
        source: true,
        status: true,
        currentStage: true,
        appliedAt: true,
        createdAt: true,
        updatedAt: true,
        rejectedAt: true,
        vacancyId: true,
        offer: {
          select: {
            status: true,
            sentAt: true,
            respondedAt: true,
            salary: true,
          },
        },
        interviews: {
          select: { id: true, status: true },
        },
        vacancy: {
          select: {
            departmentId: true,
            department: { select: { name: true } },
            status: true,
            publishedAt: true,
          },
        },
      },
      where: { deletedAt: null },
    }),

    prisma.offer.findMany({
      select: {
        status: true,
        sentAt: true,
        respondedAt: true,
        salary: true,
        applicationId: true,
      },
    }),

    prisma.interview.findMany({
      select: {
        applicationId: true,
        status: true,
        scheduledAt: true,
      },
    }),

    prisma.vacancy.findMany({
      select: {
        id: true,
        status: true,
        departmentId: true,
        department: { select: { name: true } },
        salaryMin: true,
        salaryMax: true,
        publishedAt: true,
        createdAt: true,
        headcount: true,
        filledCount: true,
      },
    }),

    prisma.jobRequisition.findMany({
      select: {
        id: true,
        vacancyId: true,
        status: true,
        createdAt: true,
        approvals: {
          select: { status: true, approvedAt: true, role: true },
        },
      },
    }),

    prisma.candidateProfile.findMany({
      select: { location: true, gender: true, dateOfBirth: true },
    }),
  ]);

  const now = new Date();
  const currentYear = now.getFullYear();

  // ─── Identify hired applications ──────────────
  const hiredApps = allApplications.filter(
    (a) => a.currentStage === "hired" || a.status === "hired",
  );
  const totalHires = hiredApps.length;

  // ─── 1. SOURCING ANALYTICS ─────────────────────
  const sourceMap = new Map<string, { count: number; hires: number }>();
  for (const app of allApplications) {
    const src = (app.source || "direct").toLowerCase();
    const existing = sourceMap.get(src) ?? { count: 0, hires: 0 };
    existing.count++;
    if (app.currentStage === "hired" || app.status === "hired") {
      existing.hires++;
    }
    sourceMap.set(src, existing);
  }

  const totalApps = allApplications.length;
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source:
        source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, " "),
      count: data.count,
      hires: data.hires,
      percentage:
        totalApps > 0 ? Math.round((data.count / totalApps) * 100) : 0,
      hireRate:
        data.count > 0 ? Math.round((data.hires / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ─── 2–4. CHANNEL RATES ───────────────────────
  // Overall rates
  const referralHires = hiredApps.filter(
    (a) => a.source?.toLowerCase() === "referral",
  ).length;
  const linkedinHires = hiredApps.filter(
    (a) => a.source?.toLowerCase() === "linkedin",
  ).length;
  const jobstreetHires = hiredApps.filter(
    (a) => a.source?.toLowerCase() === "jobstreet",
  ).length;

  const referralRate = totalHires > 0 ? (referralHires / totalHires) * 100 : 0;
  const linkedinRate = totalHires > 0 ? (linkedinHires / totalHires) * 100 : 0;
  const jobstreetRate =
    totalHires > 0 ? (jobstreetHires / totalHires) * 100 : 0;

  // Quarterly rates for current year
  const quarterlyRates = [1, 2, 3, 4].map((q) => {
    const qHires = hiredApps.filter((a) => {
      const d = a.offer?.respondedAt ?? a.updatedAt;
      return d.getFullYear() === currentYear && quarterOf(d) === q;
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
      jobstreet:
        qTotal > 0
          ? Math.round(
              (qHires.filter((a) => a.source?.toLowerCase() === "jobstreet")
                .length /
                qTotal) *
                100,
            )
          : 0,
    };
  });

  // ─── 5. CHANNEL EFFECTIVENESS ─────────────────
  const allChannels = Array.from(
    new Set([
      ...Array.from(sourceMap.keys()),
      ...Object.keys(CHANNEL_COST_IDR),
    ]),
  );

  const channelEffectiveness = allChannels
    .map((channel) => {
      const src = sourceMap.get(channel) ?? { count: 0, hires: 0 };
      const estimatedCost = src.hires * getChannelCost(channel);
      return {
        channel:
          channel.charAt(0).toUpperCase() + channel.slice(1).replace(/_/g, " "),
        hires: src.hires,
        estimatedCost,
        costPerHire: src.hires > 0 ? Math.round(estimatedCost / src.hires) : 0,
      };
    })
    .filter((c) => c.hires > 0 || c.estimatedCost > 0);

  // ─── 6. RECRUITMENT YIELD RATIO ───────────────
  // Count applications that had at least 1 non-cancelled interview
  const interviewedAppIds = new Set(
    allInterviews
      .filter((i) => i.status !== "cancelled")
      .map((i) => i.applicationId),
  );
  const totalInterviewed = interviewedAppIds.size;
  const yieldRatio =
    totalInterviewed > 0 ? (totalHires / totalInterviewed) * 100 : 0;

  // ─── 7. TIME-TO-FILL ──────────────────────────
  // Req creation → offer accepted (respondedAt)
  // Build vacancyId → earliest requisition createdAt map
  const vacancyReqMap = new Map<string, Date>();
  for (const req of allRequisitions) {
    const existing = vacancyReqMap.get(req.vacancyId);
    if (!existing || req.createdAt < existing) {
      vacancyReqMap.set(req.vacancyId, req.createdAt);
    }
  }

  // Build vacancyId → publishedAt map as fallback
  const vacancyPublishedMap = new Map<string, Date | null>();
  for (const v of allVacancies) {
    vacancyPublishedMap.set(v.id, v.publishedAt);
  }

  const timeToFillDays: number[] = [];
  for (const app of hiredApps) {
    const acceptedOffer = app.offer?.status === "accepted" ? app.offer : null;
    if (!acceptedOffer?.respondedAt) continue;

    const startDate =
      vacancyReqMap.get(app.vacancyId) ??
      vacancyPublishedMap.get(app.vacancyId) ??
      app.createdAt;

    const days = daysBetween(startDate, acceptedOffer.respondedAt);
    if (days > 0 && days < 500) timeToFillDays.push(days);
  }

  const avgTimeToFill =
    timeToFillDays.length > 0
      ? Math.round(
          timeToFillDays.reduce((a, b) => a + b, 0) / timeToFillDays.length,
        )
      : 0;

  // ─── 8. TIME-TO-HIRE ──────────────────────────
  // Application appliedAt → offer respondedAt (accepted)
  const timeToHireDays: {
    days: number;
    month: number;
    year: number;
    hiredAt: Date;
  }[] = [];
  for (const app of hiredApps) {
    const acceptedOffer = app.offer?.status === "accepted" ? app.offer : null;
    const hiredAt = acceptedOffer?.respondedAt ?? app.updatedAt;
    const start = app.appliedAt ?? app.createdAt;
    const days = daysBetween(start, hiredAt);
    if (days >= 0 && days < 500) {
      timeToHireDays.push({
        days,
        month: hiredAt.getMonth(),
        year: hiredAt.getFullYear(),
        hiredAt,
      });
    }
  }

  const avgTimeToHire =
    timeToHireDays.length > 0
      ? Math.round(
          timeToHireDays.reduce((a, b) => a + b.days, 0) /
            timeToHireDays.length,
        )
      : 0;

  // Monthly time-to-hire trend (last 6 months)
  const timeToHireTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthEntries = timeToHireDays.filter(
      (e) => e.month === m && e.year === y,
    );
    const avgDays =
      monthEntries.length > 0
        ? Math.round(
            monthEntries.reduce((a, b) => a + b.days, 0) / monthEntries.length,
          )
        : 0;
    return { month: MONTHS[m], days: avgDays, hires: monthEntries.length };
  });

  // ─── 9. DIVERSITY — Domicile, Gender, Age ──────

  // 9a. Location / Domicile
  const locMap = new Map<string, number>();
  for (const profile of allCandidateProfiles) {
    const loc = (profile.location ?? "Unknown").trim();
    locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
  }

  const totalLocs = Array.from(locMap.values()).reduce((a, b) => a + b, 0);
  const locationBreakdown = Array.from(locMap.entries())
    .map(([location, count]) => ({
      location,
      count,
      percentage: totalLocs > 0 ? (count / totalLocs) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 9b. Gender breakdown
  const genderMap = new Map<string, number>();
  for (const profile of allCandidateProfiles) {
    const g = (profile.gender ?? "not_specified").toLowerCase().trim();
    const label =
      g === "male"
        ? "Male"
        : g === "female"
          ? "Female"
          : g === "other"
            ? "Other"
            : g === "prefer_not_to_say"
              ? "Prefer Not to Say"
              : "Not Specified";
    genderMap.set(label, (genderMap.get(label) ?? 0) + 1);
  }
  const totalGender = Array.from(genderMap.values()).reduce((a, b) => a + b, 0);
  const genderBreakdown = Array.from(genderMap.entries())
    .map(([gender, count]) => ({
      gender,
      count,
      percentage: totalGender > 0 ? (count / totalGender) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 9c. Age group breakdown (from dateOfBirth)
  const ageGroupMap = new Map<string, number>();
  const ageOrder = ["Under 25", "25–34", "35–44", "45–54", "55+", "Unknown"];
  for (const profile of allCandidateProfiles) {
    let label = "Unknown";
    if (profile.dateOfBirth) {
      const ageDays =
        (now.getTime() - new Date(profile.dateOfBirth).getTime()) / 86_400_000;
      const ageYears = ageDays / 365.25;
      if (ageYears < 25) label = "Under 25";
      else if (ageYears < 35) label = "25–34";
      else if (ageYears < 45) label = "35–44";
      else if (ageYears < 55) label = "45–54";
      else label = "55+";
    }
    ageGroupMap.set(label, (ageGroupMap.get(label) ?? 0) + 1);
  }
  const totalAge = Array.from(ageGroupMap.values()).reduce((a, b) => a + b, 0);
  const ageBreakdown = ageOrder
    .filter((g) => ageGroupMap.has(g))
    .map((group) => ({
      group,
      count: ageGroupMap.get(group) ?? 0,
      percentage:
        totalAge > 0 ? ((ageGroupMap.get(group) ?? 0) / totalAge) * 100 : 0,
    }));

  // ─── 10. COST PER HIRE ────────────────────────
  // Total channel costs / total hires
  const totalEstCost = channelEffectiveness.reduce(
    (sum, c) => sum + c.estimatedCost,
    0,
  );
  const costPerHire =
    totalHires > 0 ? Math.round(totalEstCost / totalHires) : 0;

  // ─── 11. OFFER ACCEPTANCE RATE ────────────────
  const sentOffers = allOffers.filter((o) =>
    ["sent", "accepted", "rejected", "expired"].includes(o.status),
  );
  const acceptedOffers = allOffers.filter((o) => o.status === "accepted");
  const offerAcceptanceRate =
    sentOffers.length > 0
      ? (acceptedOffers.length / sentOffers.length) * 100
      : 0;

  // ─── 12. 90-DAY RETENTION ─────────────────────
  // Hired > 90 days ago. Retained = no rejectedAt after hire date
  const cutoff90 = new Date(now.getTime() - 90 * 86_400_000);
  const hires90DaysAgo = hiredApps.filter((a) => {
    const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
    return hiredAt < cutoff90;
  });

  const retained90 = hires90DaysAgo.filter((a) => {
    // If they were rejected after being hired, count as not retained
    if (a.rejectedAt) {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return a.rejectedAt < hiredAt; // rejection was BEFORE hire — ok
    }
    return true; // still active (no post-hire rejection)
  });

  const retention90Days =
    hires90DaysAgo.length > 0
      ? (retained90.length / hires90DaysAgo.length) * 100
      : 0;

  // ─── 13. QUALITY OF HIRE (6 MONTHS) ──────────
  const cutoff180 = new Date(now.getTime() - 180 * 86_400_000);
  const hires180DaysAgo = hiredApps.filter((a) => {
    const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
    return hiredAt < cutoff180;
  });

  const retained180 = hires180DaysAgo.filter((a) => {
    if (a.rejectedAt) {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return a.rejectedAt < hiredAt;
    }
    return true;
  });

  const qualityOfHire6Months =
    hires180DaysAgo.length > 0
      ? (retained180.length / hires180DaysAgo.length) * 100
      : 0;

  // ─── FUNNEL STAGES ────────────────────────────
  const funnelOrder = ["applied", "screening", "interview", "offer", "hired"];
  const funnelCounts = funnelOrder.map((stage) => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: allApplications.filter(
      (a) => a.currentStage === stage || a.status === stage,
    ).length,
  }));
  // Accumulate: each stage includes all applications that reached at least that stage
  // Use cumulative counts from the most inclusive stage
  const funnelStages = funnelCounts.map((s, i) => {
    const prevCount = i > 0 ? funnelCounts[i - 1].count : s.count;
    const dropOffRate =
      prevCount > 0 && i > 0 ? ((prevCount - s.count) / prevCount) * 100 : 0;
    return { stage: s.stage, count: s.count, dropOffRate };
  });

  // ─── DEPT BREAKDOWN ───────────────────────────
  const deptMap = new Map<
    string,
    {
      deptName: string;
      applications: number;
      hires: number;
      openRoles: number;
      ttfDays: number[];
    }
  >();

  for (const v of allVacancies) {
    const deptName = v.department?.name ?? "Unknown";
    const existing = deptMap.get(v.departmentId) ?? {
      deptName,
      applications: 0,
      hires: 0,
      openRoles: 0,
      ttfDays: [],
    };
    if (v.status === "published" || v.status === "open") {
      existing.openRoles += Math.max(
        0,
        (v.headcount ?? 1) - (v.filledCount ?? 0),
      );
    }
    deptMap.set(v.departmentId, existing);
  }

  for (const app of allApplications) {
    const deptId = app.vacancy?.departmentId;
    if (!deptId) continue;
    const existing = deptMap.get(deptId) ?? {
      deptName: app.vacancy?.department?.name ?? "Unknown",
      applications: 0,
      hires: 0,
      openRoles: 0,
      ttfDays: [],
    };
    existing.applications++;
    if (app.currentStage === "hired" || app.status === "hired") {
      existing.hires++;
      // time-to-fill for this app
      const acceptedOffer = app.offer?.status === "accepted" ? app.offer : null;
      if (acceptedOffer?.respondedAt) {
        const startDate =
          vacancyReqMap.get(app.vacancyId) ??
          vacancyPublishedMap.get(app.vacancyId) ??
          app.createdAt;
        const d = daysBetween(startDate, acceptedOffer.respondedAt);
        if (d > 0 && d < 500) existing.ttfDays.push(d);
      }
    }
    deptMap.set(deptId, existing);
  }

  const deptBreakdown = Array.from(deptMap.values())
    .map((d) => ({
      dept: d.deptName,
      openRoles: d.openRoles,
      applications: d.applications,
      hires: d.hires,
      avgTimeToFill:
        d.ttfDays.length > 0
          ? Math.round(d.ttfDays.reduce((a, b) => a + b, 0) / d.ttfDays.length)
          : 0,
    }))
    .filter((d) => d.applications > 0)
    .sort((a, b) => b.hires - a.hires);

  // ─── MONTHLY TREND (last 6 months) ────────────
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth();
    const y = d.getFullYear();

    const applications = allApplications.filter(
      (a) => a.createdAt.getMonth() === m && a.createdAt.getFullYear() === y,
    ).length;

    const hires = hiredApps.filter((a) => {
      const hiredAt = a.offer?.respondedAt ?? a.updatedAt;
      return hiredAt.getMonth() === m && hiredAt.getFullYear() === y;
    }).length;

    const interviews = allInterviews.filter(
      (iv) =>
        iv.scheduledAt.getMonth() === m && iv.scheduledAt.getFullYear() === y,
    ).length;

    const offers = allOffers.filter((o) => {
      const sentAt = o.sentAt ?? o.respondedAt;
      return sentAt && sentAt.getMonth() === m && sentAt.getFullYear() === y;
    }).length;

    return { month: MONTHS[m], applications, hires, interviews, offers };
  });

  // ─── OVERVIEW KPI CARDS ───────────────────────
  const overview = [
    {
      label: "Avg Time-to-Hire",
      value: avgTimeToHire > 0 ? `${avgTimeToHire} days` : "—",
      subValue:
        avgTimeToHire > 0 ? "application → offer accepted" : "No hires yet",
      trend: 0,
      color: "emerald",
      icon: "clock",
    },
    {
      label: "Offer Acceptance",
      value: `${offerAcceptanceRate.toFixed(0)}%`,
      subValue: `${acceptedOffers.length} of ${sentOffers.length} offers accepted`,
      trend: 0,
      color: "blue",
      icon: "check",
    },
    {
      label: "Cost per Hire",
      value: costPerHire > 0 ? formatRpShort(costPerHire) : "—",
      subValue:
        costPerHire > 0 ? "estimated channel cost basis" : "No cost data",
      trend: 0,
      color: "amber",
      icon: "dollar",
    },
    {
      label: "Yield Ratio",
      value: `${yieldRatio.toFixed(1)}%`,
      subValue: `${totalHires} hires from ${totalInterviewed} interviewed`,
      trend: 0,
      color: "purple",
      icon: "target",
    },
  ];

  const analyticsData: AnalyticsData = {
    sourceBreakdown,
    referralRate,
    linkedinRate,
    jobstreetRate,
    totalHires,
    quarterlyRates,
    channelEffectiveness,
    avgTimeToHire,
    avgTimeToFill,
    timeToHireTrend,
    deptBreakdown,
    funnelStages,
    yieldRatio,
    offerAcceptanceRate,
    retention90Days,
    qualityOfHire6Months,
    costPerHire,
    locationBreakdown,
    genderBreakdown,
    ageBreakdown,
    monthlyTrend,
    overview,
  };

  return <AnalyticsClient analyticsData={analyticsData} />;
}

// ─────────────────────────────────────────────
// Server-side number formatter (can't use Intl in some edge runtimes)
// ─────────────────────────────────────────────
function formatRpShort(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}
