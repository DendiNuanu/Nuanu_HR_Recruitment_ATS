import { prisma } from "./prisma";

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata,
}: {
  userId: string;
  type: "approval" | "interview" | "offer" | "system" | "reminder";
  title: string;
  message: string;
  link?: string;
  metadata?: unknown;
}) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, link, metadata },
    });

    // Fire-and-forget real-time emit — never throws, never awaited.
    // Socket.IO is only active when NEXT_PUBLIC_SOCKET_URL is configured;
    // on Vercel serverless it is intentionally disabled.
    Promise.resolve().then(async () => {
      try {
        const { emitEvent } = await import("./socket");
        emitEvent("new_notification", notification);
      } catch {
        // Swallow — socket unavailability must never break notification saves
      }
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
