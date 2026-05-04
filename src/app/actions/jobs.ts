"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createVacancy(formData: FormData) {
  const title = formData.get("title") as string;
  const code = formData.get("code") as string || `JOB-${Math.floor(Math.random() * 10000)}`;
  const departmentName = formData.get("departmentName") as string;
  const employmentType = formData.get("employmentType") as string;
  const location = formData.get("location") as string;
  const headcount = parseInt(formData.get("headcount") as string) || 1;
  const description = formData.get("description") as string;
  const requirements = formData.get("requirements") as string;

  // Find or Create Department
  let targetDept = await prisma.department.findUnique({
    where: { name: departmentName }
  });

  if (!targetDept && departmentName) {
    targetDept = await prisma.department.create({
      data: {
        name: departmentName,
        code: departmentName.substring(0, 3).toUpperCase(), // Basic auto-code
      }
    });
  }

  const departmentId = targetDept?.id;

  if (!departmentId) {
    throw new Error("Department is required.");
  }


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

export async function updateVacancy(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const departmentName = formData.get("departmentName") as string;
  const employmentType = formData.get("employmentType") as string;
  const location = formData.get("location") as string;
  const headcount = parseInt(formData.get("headcount") as string) || 1;
  const description = formData.get("description") as string;
  const requirements = formData.get("requirements") as string;
  const status = formData.get("status") as string || "published";

  // Find or Create Department
  let targetDept = await prisma.department.findUnique({
    where: { name: departmentName }
  });

  if (!targetDept && departmentName) {
    targetDept = await prisma.department.create({
      data: {
        name: departmentName,
        code: departmentName.substring(0, 3).toUpperCase(),
      }
    });
  }

  const departmentId = targetDept?.id;

  if (!departmentId) {
    throw new Error("Department is required.");
  }

  await prisma.vacancy.update({
    where: { id },
    data: {
      title,
      departmentId,
      employmentType,
      location,
      headcount,
      description,
      requirements,
      status: status as any,
    }
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath(`/dashboard/jobs/${id}/edit`);
  revalidatePath("/careers");
  redirect("/dashboard/jobs");
}

export async function deleteVacancy(id: string) {
  // Cascading deletes should handle related records if configured in Prisma
  // But we can be explicit if needed.
  await prisma.vacancy.delete({
    where: { id }
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath("/careers");
  return { success: true };
}

export async function duplicateVacancy(id: string) {
  try {
    const original = await prisma.vacancy.findUnique({
      where: { id },
      include: { department: true }
    });

    if (!original) throw new Error("Original vacancy not found");

    // Generate a new unique code
    const newCode = `JOB-${Math.floor(Math.random() * 10000)}-CLONE`;

    const duplicated = await prisma.vacancy.create({
      data: {
        title: `${original.title} (Copy)`,
        code: newCode,
        departmentId: original.departmentId,
        creatorId: original.creatorId,
        recruiterId: original.recruiterId,
        description: original.description,
        requirements: original.requirements,
        responsibilities: original.responsibilities,
        skills: original.skills,
        experienceMin: original.experienceMin,
        experienceMax: original.experienceMax,
        educationLevel: original.educationLevel,
        employmentType: original.employmentType,
        locationType: original.locationType,
        location: original.location,
        salaryMin: original.salaryMin,
        salaryMax: original.salaryMax,
        currency: original.currency,
        headcount: original.headcount,
        priority: original.priority,
        status: "draft", // Clones are always drafts initially
      }
    });

    revalidatePath("/dashboard/jobs");
    return { success: true, id: duplicated.id };
  } catch (error) {
    console.error("Duplication failed:", error);
    return { success: false, error: "Failed to duplicate job" };
  }
}
