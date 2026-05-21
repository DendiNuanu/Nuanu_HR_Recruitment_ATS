"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markJobAsPostedToJobStreet(
  jobId: string,
  jobStreetUrl?: string,
) {
  const existing = await prisma.jobPosting.findFirst({
    where: { vacancyId: jobId, channel: { in: ["seek", "jobstreet"] } },
  });

  if (existing) {
    await prisma.jobPosting.update({
      where: { id: existing.id },
      data: {
        status: "active",
        externalUrl: jobStreetUrl || null,
        publishedAt: new Date(),
      },
    });
  } else {
    await prisma.jobPosting.create({
      data: {
        vacancyId: jobId,
        channel: "seek",
        status: "active",
        externalUrl: jobStreetUrl || null,
        publishedAt: new Date(),
      },
    });
  }

  revalidatePath("/dashboard/jobs");
  return { success: true };
}

export async function getJobStreetPostingStatus(jobId: string) {
  const posting = await prisma.jobPosting.findFirst({
    where: { vacancyId: jobId, channel: { in: ["seek", "jobstreet"] } },
  });
  return posting;
}
