"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function getIntegrationSettings(name: string) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { name },
    });
    return integration;
  } catch (error) {
    console.error(`Failed to fetch ${name} settings:`, error);
    return null;
  }
}

export async function updateIntegrationSettings(
  name: string,
  type: string,
  config: any,
  isActive: boolean,
) {
  try {
    const integration = await prisma.integration.upsert({
      where: { name },
      update: {
        config,
        isActive,
        updatedAt: new Date(),
      },
      create: {
        name,
        type,
        config,
        isActive,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, integration };
  } catch (error) {
    console.error(`Failed to update ${name} settings:`, error);
    return { success: false, error: "Failed to save settings" };
  }
}

export async function getCalendarStatus() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nuanu_token")?.value;

    if (!token) return { connected: false };

    const payload = await verifyToken(token);
    if (!payload) return { connected: false };

    const integration = await prisma.calendarIntegration.findUnique({
      where: { userId: payload.id as string },
    });

    return { connected: !!integration };
  } catch (error) {
    return { connected: false };
  }
}

// User Management Actions
export async function getUsers() {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      console.warn("Unauthorized attempt to fetch users by:", session?.email);
      return [];
    }

    return await prisma.user.findMany({
      where: {
        deletedAt: null, // exclude soft-deleted users
        userRoles: {
          some: {
            role: {
              slug: {
                notIn: ["candidate"],
              },
            },
          },
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
        department: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export async function getRoles() {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return [];
    }

    return await prisma.role.findMany();
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return [];
  }
}

export async function inviteUser(data: {
  name: string;
  email: string;
  roleId: string;
  departmentId?: string;
}) {
  try {
    if (!data.name?.trim() || !data.email?.trim() || !data.roleId?.trim()) {
      return { success: false, error: "Name, email and role are required" };
    }

    // Generate a strong temporary password
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const tempPassword = Array.from(
      { length: 10 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Normalize departmentId — empty string must become null to avoid FK violation
    const departmentId = data.departmentId?.trim() || null;

    await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        isActive: true,
        departmentId,
        userRoles: {
          create: { roleId: data.roleId },
        },
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, tempPassword };
  } catch (error: any) {
    console.error("Failed to invite user:", error);
    if (error?.code === "P2002") {
      return { success: false, error: "A user with this email already exists" };
    }
    if (error?.code === "P2003") {
      return { success: false, error: "Invalid role or department selected" };
    }
    return {
      success: false,
      error: `Failed to create user: ${error?.message ?? "unknown error"}`,
    };
  }
}

export async function deleteUser(userId: string) {
  try {
    // Soft-delete: mark as inactive + set deletedAt.
    // Hard-deleting fails due to FK constraints on Vacancy, Application,
    // Interview, LegacyApproval, etc. — none of which have onDelete: Cascade.
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        // Detach from department so the slot is freed
        departmentId: null,
      },
    });

    // Also remove the user's role assignments so they no longer appear
    // in any role-based queries.
    await prisma.userRole.deleteMany({ where: { userId } });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return {
      success: false,
      error: `Failed to remove user: ${error?.message ?? "unknown error"}`,
    };
  }
}

export async function updateUserRole(userId: string, roleId: string) {
  try {
    // Delete existing roles and add new one
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.create({ data: { userId, roleId } }),
    ]);

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function updateUser(
  userId: string,
  data: {
    name: string;
    email: string;
    roleId: string;
    departmentId?: string;
  },
) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          email: data.email,
          departmentId: data.departmentId || null,
          updatedAt: new Date(),
        },
      }),
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.create({ data: { userId, roleId: data.roleId } }),
    ]);

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "Email already in use by another account",
      };
    }
    return { success: false, error: "Failed to update user" };
  }
}

export async function updateCompanyLogo(logoUrl: string) {
  try {
    const existing = await prisma.integration.findUnique({
      where: { name: "general_info" },
    });

    const config = (existing?.config as any) || {};

    await prisma.integration.upsert({
      where: { name: "general_info" },
      update: {
        config: { ...config, logo: logoUrl },
        updatedAt: new Date(),
      },
      create: {
        name: "general_info",
        type: "general",
        config: { logo: logoUrl },
        isActive: true,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update logo:", error);
    return { success: false, error: "Failed to update logo" };
  }
}

export async function getCurrentUser() {
  return await getSession();
}

export async function getAIStatus() {
  try {
    const aiUrl =
      process.env.AI_API_URL || "http://127.0.0.1:11434/v1/chat/completions";
    const aiKey = process.env.AI_API_KEY || "";
    const aiModel = process.env.AI_MODEL || "qwen2.5";

    const isCloud =
      aiUrl.includes("groq") ||
      aiUrl.includes("openai") ||
      aiUrl.includes("openrouter");
    const providerName = isCloud
      ? aiUrl.includes("groq")
        ? "Groq (Cloud)"
        : "Cloud AI"
      : "Ollama (Local)";

    // Simple health check call
    // For Ollama we can check tags, for Cloud we check if URL exists
    const checkUrl = isCloud
      ? aiUrl.replace("/chat/completions", "")
      : aiUrl.replace("/v1/chat/completions", "/api/tags");

    const response = await fetch(checkUrl, {
      method: "GET",
      cache: "no-store",
      headers: aiKey ? { Authorization: `Bearer ${aiKey}` } : {},
    });

    if (response.ok || isCloud) {
      // Cloud APIs might not respond to GET on base URL, so if we have a key/URL we assume it's "configured"
      return {
        success: true,
        status: "ON",
        model: aiModel,
        provider: providerName,
      };
    }
    return {
      success: true,
      status: "OFF",
      provider: providerName,
      error: "AI endpoint not reachable",
    };
  } catch (error) {
    return {
      success: true,
      status: "OFF",
      provider: "Not Configured",
      error: "AI server not reachable",
    };
  }
}

export async function getEmailConfig() {
  try {
    const integration = await prisma.integration.findUnique({
      where: { name: "email_smtp" },
    });
    if (!integration) return null;
    const c = integration.config as any;
    return {
      host: c.host ?? "",
      port: c.port ?? "587",
      user: c.user ?? "",
      pass: c.pass ?? "",
      from: c.from ?? "",
      isActive: integration.isActive,
    };
  } catch {
    return null;
  }
}

export async function saveEmailConfig(data: {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
}) {
  try {
    await prisma.integration.upsert({
      where: { name: "email_smtp" },
      update: {
        config: data as any,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        name: "email_smtp",
        type: "smtp",
        config: data as any,
        isActive: true,
      },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message ?? "Failed to save" };
  }
}

export async function sendTestEmail(toEmail: string) {
  // Import inline to avoid circular deps
  const { sendEmail } = await import("@/lib/email");
  const result = await sendEmail({
    to: toEmail,
    subject: "Nuanu ATS \u2014 Email Configuration Test",
    text: `Hi,\n\nThis is a test email from Nuanu HR Recruitment ATS.\nIf you received this, your email configuration is working correctly!\n\nSent at: ${new Date().toISOString()}\n\nBest regards,\nNuanu ATS`,
  });
  return result;
}

/**
 * Create a new user with an admin-specified password (no temp password).
 */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  departmentId?: string;
}) {
  try {
    if (
      !data.name?.trim() ||
      !data.email?.trim() ||
      !data.password?.trim() ||
      !data.roleId?.trim()
    ) {
      return {
        success: false,
        error: "Name, email, password and role are required",
      };
    }
    if (data.password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const departmentId = data.departmentId?.trim() || null;

    await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        isActive: true,
        departmentId,
        userRoles: { create: { roleId: data.roleId } },
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create user:", error);
    if (error?.code === "P2002") {
      return { success: false, error: "A user with this email already exists" };
    }
    if (error?.code === "P2003") {
      return { success: false, error: "Invalid role or department selected" };
    }
    return { success: false, error: error?.message ?? "Failed to create user" };
  }
}

// ─── Role Management Actions ──────────────────────────────────────────────────

export async function createRole(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name?.trim() || !data.slug?.trim()) {
      return { success: false, error: "Name and slug are required" };
    }

    await prisma.role.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        description: data.description?.trim() || null,
        isSystem: false,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create role:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "A role with this name or slug already exists",
      };
    }
    return { success: false, error: error?.message ?? "Failed to create role" };
  }
}

export async function updateRole(
  roleId: string,
  data: { name: string; description?: string },
) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return { success: false, error: "Role not found" };
    if (role.isSystem)
      return { success: false, error: "System roles cannot be edited" };

    await prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update role:", error);
    if (error?.code === "P2002") {
      return { success: false, error: "A role with this name already exists" };
    }
    return { success: false, error: error?.message ?? "Failed to update role" };
  }
}

export async function deleteRole(roleId: string) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return { success: false, error: "Role not found" };
    if (role.isSystem)
      return { success: false, error: "System roles cannot be deleted" };

    await prisma.role.delete({ where: { id: roleId } });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete role:", error);
    return { success: false, error: error?.message ?? "Failed to delete role" };
  }
}

// ─── Department Management Actions ────────────────────────────────────────────

export async function createDepartment(data: {
  name: string;
  code: string;
  description?: string;
}) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.name?.trim() || !data.code?.trim()) {
      return { success: false, error: "Name and code are required" };
    }

    await prisma.department.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || null,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create department:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "A department with this name or code already exists",
      };
    }
    return {
      success: false,
      error: error?.message ?? "Failed to create department",
    };
  }
}

export async function updateDepartment(
  id: string,
  data: { name: string; code: string; description?: string },
) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.department.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || null,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update department:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "A department with this name or code already exists",
      };
    }
    return {
      success: false,
      error: error?.message ?? "Failed to update department",
    };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // Soft delete: mark as inactive
    await prisma.department.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete department:", error);
    return {
      success: false,
      error: error?.message ?? "Failed to delete department",
    };
  }
}

/**
 * Change a user's password (admin action — no old password required).
 */
export async function changeUserPassword(userId: string, newPassword: string) {
  try {
    const session = await getSession();
    if (
      !session ||
      (!session.roles.includes("admin") &&
        !session.roles.includes("super-admin"))
    ) {
      return { success: false, error: "Unauthorized" };
    }
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to change password:", error);
    return {
      success: false,
      error: error?.message ?? "Failed to change password",
    };
  }
}
