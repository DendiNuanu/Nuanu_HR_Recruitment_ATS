"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function createVacancy(formData: FormData) {
  const title = formData.get("title") as string;
  const code =
    (formData.get("code") as string) ||
    `JOB-${Math.floor(Math.random() * 10000)}`;
  const departmentName = formData.get("departmentName") as string;
  const employmentType = formData.get("employmentType") as string;
  const location = formData.get("location") as string;
  const headcount = parseInt(formData.get("headcount") as string) || 1;
  const description = formData.get("description") as string;
  const requirements = formData.get("requirements") as string;

  // Find or Create Department
  let targetDept = await prisma.department.findUnique({
    where: { name: departmentName },
  });

  if (!targetDept && departmentName) {
    targetDept = await prisma.department.create({
      data: {
        name: departmentName,
        code: departmentName.substring(0, 3).toUpperCase(), // Basic auto-code
      },
    });
  }

  const departmentId = targetDept?.id;

  if (!departmentId) {
    throw new Error("Department is required.");
  }

  const publishToCareers = formData.get("publishCareers") === "on";
  const publishToLinkedIn = formData.get("publishLinkedIn") === "on";
  const publishToJobStreet = formData.get("publishJobStreet") === "on";

  // Prefer the logged-in user's ID from the session; fall back to the admin
  // account so the action still works when called without a browser session
  // (e.g. during seeding / automated flows).
  const session = await getSession();
  let creatorId: string;
  let cachedAdminId: string | null = null;

  if (session?.id) {
    creatorId = session.id;
  } else {
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@nuanu.com" },
    });
    if (!adminUser) {
      throw new Error("Admin user not found. Please run database seed.");
    }
    creatorId = adminUser.id;
    cachedAdminId = adminUser.id;
  }

  // Create the Vacancy — set status directly based on publish intent so we
  // never need to fire the heavy createRequisition transaction from here.
  const newVacancy = await prisma.vacancy.create({
    data: {
      title,
      code,
      departmentId,
      creatorId,
      employmentType,
      location,
      headcount,
      description,
      requirements,
      status: publishToCareers ? "pending_approval" : "draft",
      isApproved: false,
      publishedAt: null,
    },
  });

  // Set up the approval workflow inline — no heavy transaction needed for
  // these three lightweight inserts.
  if (publishToCareers) {
    // Resolve admin ID (may already be cached from the session-fallback path)
    if (!cachedAdminId) {
      const adminUser = await prisma.user.findFirst({
        where: { email: "admin@nuanu.com" },
      });
      cachedAdminId = adminUser?.id ?? creatorId;
    }
    const approverId = cachedAdminId;

    // Lightweight requisition record — no transaction needed
    const requisition = await prisma.jobRequisition.create({
      data: {
        vacancyId: newVacancy.id,
        requestedById: creatorId,
        status: "PENDING",
        currentStep: 1,
      },
    });

    // All 3 approval records in one round-trip, admin as approver for every role
    await prisma.approval.createMany({
      data: [
        {
          requisitionId: requisition.id,
          approverId,
          role: "MANAGER",
          status: "PENDING",
        },
        {
          requisitionId: requisition.id,
          approverId,
          role: "HR",
          status: "PENDING",
        },
        {
          requisitionId: requisition.id,
          approverId,
          role: "FINANCE",
          status: "PENDING",
        },
      ],
    });

    // Fire notification without blocking the server action
    createNotification({
      userId: approverId,
      type: "system",
      title: "New Job Requisition",
      message: "A new job vacancy requires your approval.",
      link: "/dashboard/requisitions",
    }).catch(console.error);
  }

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
  const status = (formData.get("status") as string) || "published";

  // Find or Create Department
  let targetDept = await prisma.department.findUnique({
    where: { name: departmentName },
  });

  if (!targetDept && departmentName) {
    targetDept = await prisma.department.create({
      data: {
        name: departmentName,
        code: departmentName.substring(0, 3).toUpperCase(),
      },
    });
  }

  const departmentId = targetDept?.id;

  if (!departmentId) {
    throw new Error("Department is required.");
  }

  const existing = await prisma.vacancy.findUnique({ where: { id } });

  if (status === "published" && !existing?.isApproved) {
    throw new Error("Vacancy must be approved before publishing.");
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
    },
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
    where: { id },
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath("/careers");
  return { success: true };
}

export async function duplicateVacancy(id: string) {
  try {
    const original = await prisma.vacancy.findUnique({
      where: { id },
      include: { department: true },
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
      },
    });

    revalidatePath("/dashboard/jobs");
    return { success: true, id: duplicated.id };
  } catch (error) {
    console.error("Duplication failed:", error);
    return { success: false, error: "Failed to duplicate job" };
  }
}

export async function publishVacancy(id: string) {
  try {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id },
    });

    if (!vacancy) throw new Error("Vacancy not found");
    if (!vacancy.isApproved)
      throw new Error("Vacancy must be approved before publishing");

    await prisma.vacancy.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    // Manage Job Posting record
    const existingPosting = await prisma.jobPosting.findFirst({
      where: {
        vacancyId: id,
        channel: "internal",
      },
    });

    if (existingPosting) {
      await prisma.jobPosting.update({
        where: { id: existingPosting.id },
        data: {
          status: "active",
          publishedAt: new Date(),
        },
      });
    } else {
      await prisma.jobPosting.create({
        data: {
          vacancyId: id,
          channel: "internal",
          status: "active",
          publishedAt: new Date(),
        },
      });
    }

    revalidatePath("/dashboard/jobs");
    revalidatePath("/careers");
    return { success: true };
  } catch (error: any) {
    console.error("Publishing failed:", error);
    return { success: false, error: error.message };
  }
}
