import { prisma } from "@/lib/prisma";
import GenerateOfferForm from "@/components/offers/GenerateOfferForm";

export const dynamic = "force-dynamic";

export default async function GenerateOfferPage() {
  const applicationsDb = await prisma.application.findMany({
    where: {
      status: { notIn: ["rejected", "hired"] },
      offer: null, // only apps without an existing offer
    },
    include: { candidate: true, vacancy: true },
    orderBy: { createdAt: "desc" },
  });

  const activeApplications = applicationsDb.map((app) => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title,
  }));

  return <GenerateOfferForm activeApplications={activeApplications} />;
}
