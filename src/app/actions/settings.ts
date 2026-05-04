"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
