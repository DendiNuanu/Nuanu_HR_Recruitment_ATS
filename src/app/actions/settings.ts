"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken, getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function getIntegrationSettings(name: string) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { name }
    });
    return integration;
  } catch (error) {
    console.error(`Failed to fetch ${name} settings:`, error);
    return null;
  }
}

export async function updateIntegrationSettings(name: string, type: string, config: any, isActive: boolean) {
  try {
    const integration = await prisma.integration.upsert({
      where: { name },
      update: {
        config,
        isActive,
        updatedAt: new Date()
      },
      create: {
        name,
        type,
        config,
        isActive,
      }
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
      where: { userId: payload.id as string }
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
    if (!session || (!session.roles.includes("admin") && !session.roles.includes("super-admin"))) {
      console.warn("Unauthorized attempt to fetch users by:", session?.email);
      return [];
    }

    return await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              slug: {
                notIn: ["candidate"]
              }
            }
          }
        }
      },
      include: {
        userRoles: {
          include: { role: true }
        },
        department: true
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export async function getRoles() {
  try {
    const session = await getSession();
    if (!session || (!session.roles.includes("admin") && !session.roles.includes("super-admin"))) {
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
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        departmentId: data.departmentId,
        userRoles: {
          create: {
            roleId: data.roleId
          }
        }
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: true, tempPassword }; // In real app, send via email
  } catch (error) {
    console.error("Failed to invite user:", error);
    return { success: false, error: "Email already exists or invalid data" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId }
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function updateUserRole(userId: string, roleId: string) {
  try {
    // Delete existing roles and add new one
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.create({ data: { userId, roleId } })
    ]);
    
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function updateCompanyLogo(logoUrl: string) {
  try {
    const existing = await prisma.integration.findUnique({
      where: { name: "general_info" }
    });
    
    const config = (existing?.config as any) || {};
    
    await prisma.integration.upsert({
      where: { name: "general_info" },
      update: {
        config: { ...config, logo: logoUrl },
        updatedAt: new Date()
      },
      create: {
        name: "general_info",
        type: "general",
        config: { logo: logoUrl },
        isActive: true,
      }
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
