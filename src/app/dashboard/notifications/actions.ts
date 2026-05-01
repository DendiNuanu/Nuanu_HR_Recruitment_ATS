"use server";

import { prisma } from "@/lib/prisma";

export async function getNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    
    return notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || undefined,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString()
    }));
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return [];
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
