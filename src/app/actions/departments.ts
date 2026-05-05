"use server";

import { prisma } from "@/lib/prisma";

export async function getDepartments() {
  try {
    return await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return [];
  }
}
