import { prisma } from "@/lib/prisma";
import OffersClient, { OfferData } from "./OffersClient";

export default async function OffersPage() {
  const offersDb = await prisma.offer.findMany({
    include: {
      application: {
        include: {
          candidate: true,
          vacancy: true,
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const offers: OfferData[] = offersDb.map(o => ({
    id: o.id,
    candidateName: o.application.candidate.name,
    position: o.application.vacancy.title,
    salary: o.salary,
    bonus: o.bonus || undefined,
    status: o.status,
    startDate: o.startDate || new Date(),
  }));

  return <OffersClient offers={offers} />;
}
