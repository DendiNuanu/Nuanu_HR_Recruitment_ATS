import { prisma } from "./prisma";

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8708236788:AAElOtlQE3fuFk9tbAbYM8mvsGLHJVMMsBY";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ─── Core send ────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown" },
): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode ?? "HTML",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Telegram] sendMessage failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error("[Telegram] sendMessage error:", err);
  }
}

// ─── Subscriber storage (Integration table) ───────────────────────────────────

const INTEGRATION_NAME = "telegram_bot";

async function getOrCreateIntegration(): Promise<{ chatIds: string[] }> {
  try {
    const row = await prisma.integration.findUnique({
      where: { name: INTEGRATION_NAME },
    });

    if (!row) {
      await prisma.integration.create({
        data: {
          name: INTEGRATION_NAME,
          type: "telegram",
          config: { chatIds: [] },
          isActive: true,
        },
      });
      return { chatIds: [] };
    }

    const config = row.config as { chatIds?: string[] } | null;
    return { chatIds: config?.chatIds ?? [] };
  } catch (err) {
    console.error("[Telegram] getOrCreateIntegration error:", err);
    return { chatIds: [] };
  }
}

export async function getTelegramSubscribers(): Promise<string[]> {
  const { chatIds } = await getOrCreateIntegration();
  return chatIds;
}

export async function addTelegramSubscriber(chatId: string): Promise<void> {
  try {
    const { chatIds } = await getOrCreateIntegration();
    if (chatIds.includes(chatId)) return;

    await prisma.integration.upsert({
      where: { name: INTEGRATION_NAME },
      update: { config: { chatIds: [...chatIds, chatId] } },
      create: {
        name: INTEGRATION_NAME,
        type: "telegram",
        config: { chatIds: [chatId] },
        isActive: true,
      },
    });
  } catch (err) {
    console.error("[Telegram] addTelegramSubscriber error:", err);
  }
}

export async function removeTelegramSubscriber(chatId: string): Promise<void> {
  try {
    const { chatIds } = await getOrCreateIntegration();
    const filtered = chatIds.filter((id) => id !== chatId);

    await prisma.integration.upsert({
      where: { name: INTEGRATION_NAME },
      update: { config: { chatIds: filtered } },
      create: {
        name: INTEGRATION_NAME,
        type: "telegram",
        config: { chatIds: filtered },
        isActive: true,
      },
    });
  } catch (err) {
    console.error("[Telegram] removeTelegramSubscriber error:", err);
  }
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

export async function sendTelegramNotification(text: string): Promise<void> {
  try {
    const chatIds = await getTelegramSubscribers();
    if (chatIds.length === 0) return;

    // Fire all sends concurrently; individual failures are already swallowed inside sendTelegramMessage
    await Promise.all(chatIds.map((id) => sendTelegramMessage(id, text)));
  } catch (err) {
    console.error("[Telegram] sendTelegramNotification error:", err);
  }
}

// ─── Webhook registration ─────────────────────────────────────────────────────

export async function setWebhook(webhookUrl: string): Promise<unknown> {
  try {
    const res = await fetch(
      `${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
    );
    const data = await res.json();
    console.log("[Telegram] setWebhook response:", data);
    return data;
  } catch (err) {
    console.error("[Telegram] setWebhook error:", err);
    return null;
  }
}
