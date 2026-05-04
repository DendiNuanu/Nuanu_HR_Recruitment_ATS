import { prisma } from "@/lib/prisma";
import AnalyticsClient, { AnalyticsData } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const sourceGroups = await prisma.application.groupBy({
    by: ['source'],
    _count: true,
  });

  const totalSources = sourceGroups.reduce((acc, curr) => acc + curr._count, 0);
  const candidateSourceBreakdown = sourceGroups.map(s => ({
    source: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    count: s._count,
    percentage: totalSources > 0 ? Math.round((s._count / totalSources) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  const offers = await prisma.offer.findMany({ select: { status: true } });
  const acceptedOffers = offers.filter(o => o.status === "accepted").length;
  const offerAcceptanceRate = offers.length > 0 ? Math.round((acceptedOffers / offers.length) * 100) : 0;

  const overview = [
    { label: "Time to Hire", value: "32 Days", change: "-12%", color: "emerald" }, // Mocked
    { label: "Cost per Hire", value: "Rp 3.500.000", change: "-5%", color: "blue" }, // Mocked
    { label: "Offer Acceptance", value: `${offerAcceptanceRate}%`, change: "+3%", color: "purple" },
    { label: "Retention Rate", value: "95%", change: "+1%", color: "amber" }, // Mocked
  ];

  const timeToHire = [
    { month: "Jan", days: 38 }, { month: "Feb", days: 35 },
    { month: "Mar", days: 34 }, { month: "Apr", days: 33 },
    { month: "May", days: 32 }, { month: "Jun", days: 32 }
  ];

  const analyticsData: AnalyticsData = {
    candidateSourceBreakdown,
    overview,
    timeToHire,
  };

  return <AnalyticsClient analyticsData={analyticsData} />;
}
