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

    // Map type → emoji for Telegram message
    const typeEmoji: Record<string, string> = {
      approval: "✅",
      interview: "📅",
      offer: "📄",
      system: "🔔",
      reminder: "⏰",
    };
    const emoji = typeEmoji[type] ?? "🔔";

    const telegramText = [
      `${emoji} <b>${title}</b>`,
      "",
      message,
      "",
      "<i>Nuanu HR Recruitment ATS</i>",
    ].join("\n");

    // Fire-and-forget side effects — socket + telegram — never throw, never awaited.
    Promise.resolve().then(async () => {
      // Socket.IO real-time emit (only active when NEXT_PUBLIC_SOCKET_URL is set)
      try {
        const { emitEvent } = await import("./socket");
        emitEvent("new_notification", notification);
      } catch {
        // Swallow — socket unavailability must never break notification saves
      }

      // Telegram broadcast to all subscribers
      try {
        const { sendTelegramNotification } = await import("./telegram");
        await sendTelegramNotification(telegramText);
      } catch {
        // Swallow — Telegram unavailability must never break notification saves
      }
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
