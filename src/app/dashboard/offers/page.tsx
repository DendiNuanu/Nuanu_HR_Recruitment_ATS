import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import OffersClient, { OfferData } from "./OffersClient";

const getCachedOffersData = unstable_cache(
  async () => {
    const offersDb = await prisma.offer.findMany({
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const offers: OfferData[] = offersDb.map((o) => ({
      id: o.id,
      candidateName: o.application.candidate.name,
      position: o.application.vacancy.title,
      salary: o.salary,
      bonus: o.bonus || undefined,
      status: o.status,
      startDate: o.startDate || new Date(),
    }));

    const applicationsDb = await prisma.application.findMany({
      where: { status: { notIn: ["rejected", "hired"] } },
      include: { candidate: true, vacancy: true },
      orderBy: { createdAt: "desc" },
    });

    const activeApplications = applicationsDb.map((app) => ({
      id: app.id,
      candidateName: app.candidate.name,
      vacancyTitle: app.vacancy.title,
    }));

    return { offers, activeApplications };
  },
  ["offers-page-data"],
  { revalidate: 60, tags: ["offers", "applications"] },
);

export default async function OffersPage() {
  const { offers, activeApplications } = await getCachedOffersData();

  return (
    <OffersClient offers={offers} activeApplications={activeApplications} />
  );
}
