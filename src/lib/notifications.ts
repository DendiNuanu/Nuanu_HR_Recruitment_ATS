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
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata
      }
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
