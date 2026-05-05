import { prisma } from "./prisma";

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata
}: {
  userId: string;
  type: 'approval' | 'interview' | 'offer' | 'system' | 'reminder';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata
      }
    });

    // Real-time emit
    try {
      const { emitEvent } = await import("./socket");
      emitEvent("new_notification", notification);
    } catch (socketError) {
      console.warn("Socket emit failed, but notification was saved.");
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
