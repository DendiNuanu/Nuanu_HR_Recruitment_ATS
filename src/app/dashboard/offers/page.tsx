import { prisma } from "@/lib/prisma";
import OffersClient from "./OffersClient";

export default async function OffersPage() {
  const [offersDb, applicationsDb] = await Promise.all([
    prisma.offer.findMany({
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany({
      where: {
        status: { notIn: ["rejected", "hired"] },
        offer: null, // only apps without an existing offer
      },
      include: { candidate: true, vacancy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const offers = offersDb.map((o) => ({
    id: o.id,
    applicationId: o.applicationId,
    candidateName: o.application.candidate.name,
    candidateEmail: o.application.candidate.email,
    position: o.application.vacancy.title,
    salary: o.salary,
    bonus: o.bonus ?? undefined,
    benefits: o.benefits ?? undefined,
    equity: o.equity ?? undefined,
    status: o.status,
    startDate: o.startDate?.toISOString() ?? null,
    expiresAt: o.expiresAt?.toISOString() ?? null,
    sentAt: o.sentAt?.toISOString() ?? null,
    respondedAt: o.respondedAt?.toISOString() ?? null,
    rejectionReason: o.rejectionReason ?? null,
    notes: o.notes ?? null,
    documentUrl: o.documentUrl ?? null,
    createdAt: o.createdAt.toISOString(),
  }));

  const respondedOffers = offersDb.filter((o) =>
    ["accepted", "rejected"].includes(o.status),
  );

  const stats = {
    total: offersDb.length,
    draft: offersDb.filter((o) => o.status === "draft").length,
    sent: offersDb.filter((o) => o.status === "sent").length,
    accepted: offersDb.filter((o) => o.status === "accepted").length,
    rejected: offersDb.filter((o) => o.status === "rejected").length,
    acceptanceRate:
      respondedOffers.length > 0
        ? Math.round(
            (offersDb.filter((o) => o.status === "accepted").length /
              respondedOffers.length) *
              100,
          )
        : 0,
  };

  const activeApplications = applicationsDb.map((app) => ({
    id: app.id,
    candidateName: app.candidate.name,
    vacancyTitle: app.vacancy.title,
  }));

  return (
    <OffersClient
      offers={offers}
      activeApplications={activeApplications}
      stats={stats}
    />
  );
}
