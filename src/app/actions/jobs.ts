"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createVacancy(formData: FormData) {
  const title = formData.get("title") as string;
  const code = formData.get("code") as string || `JOB-${Math.floor(Math.random() * 10000)}`;
  const departmentId = formData.get("departmentId") as string;
  const employmentType = formData.get("employmentType") as string;
  const location = formData.get("location") as string;
  const headcount = parseInt(formData.get("headcount") as string) || 1;
  const description = formData.get("description") as string;
  const requirements = formData.get("requirements") as string;

  const publishToCareers = formData.get("publishCareers") === "on";
  const publishToLinkedIn = formData.get("publishLinkedIn") === "on";
  const publishToJobStreet = formData.get("publishJobStreet") === "on";

  // In a real app, you would get creatorId from the auth session
  // For this ATS, we'll find the Super Admin user to assign as creator
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@nuanu.com" }
  });

  if (!adminUser) {
    throw new Error("Admin user not found. Please run database seed.");
  }

  // Create the Vacancy
  const newVacancy = await prisma.vacancy.create({
    data: {
      title,
      code,
      departmentId,
      creatorId: adminUser.id,
      employmentType,
      location,
      headcount,
      description,
      requirements,
      status: publishToCareers ? "published" : "draft",
      publishedAt: publishToCareers ? new Date() : null,
    }
  });

  // Create mock JobPostings if third-party toggles are on
  const postings = [];
  
  if (publishToCareers) {
    postings.push({
      vacancyId: newVacancy.id,
      channel: "internal",
      status: "active",
      publishedAt: new Date(),
    });
  }
  
  if (publishToLinkedIn) {
    postings.push({
      vacancyId: newVacancy.id,
      channel: "linkedin",
      status: "active",
      publishedAt: new Date(),
    });
  }

  if (publishToJobStreet) {
    postings.push({
      vacancyId: newVacancy.id,
      channel: "jobstreet",
      status: "active",
      publishedAt: new Date(),
    });
  }

  if (postings.length > 0) {
    await prisma.jobPosting.createMany({
      data: postings,
    });
  }

  // Clear cache for jobs page and redirect
  revalidatePath("/dashboard/jobs");
  revalidatePath("/careers");
  redirect("/dashboard/jobs");
}
