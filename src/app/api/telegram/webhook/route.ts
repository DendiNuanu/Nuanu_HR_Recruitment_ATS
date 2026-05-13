import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramMessage,
  addTelegramSubscriber,
  removeTelegramSubscriber,
} from "@/lib/telegram";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowWIB(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

// ─── Command handlers ─────────────────────────────────────────────────────────

async function handleStart(
  chatId: number,
  username: string,
): Promise<void> {
  await addTelegramSubscriber(String(chatId));

  const msg = [
    "🏢 <b>Nuanu HR Recruitment ATS</b>",
    "",
    `Welcome, ${username}! I'll keep you updated on recruitment activities.`,
    "",
    "<b>Commands:</b>",
    "/status - System overview",
    "/pending - Pending approvals",
    "/interviews - Upcoming interviews",
    "/candidates - Recent candidates",
    "/help - Show this message",
    "/stop - Unsubscribe from notifications",
    "",
    "You're now subscribed to notifications! ✅",
  ].join("\n");

  await sendTelegramMessage(chatId, msg);
}

async function handleStop(chatId: number): Promise<void> {
  await removeTelegramSubscriber(String(chatId));
  await sendTelegramMessage(
    chatId,
    "👋 You've been unsubscribed from Nuanu ATS notifications.\n\nSend /start anytime to re-subscribe.",
  );
}

async function handleHelp(chatId: number): Promise<void> {
  const msg = [
    "🤖 <b>Nuanu ATS Bot — Commands</b>",
    "",
    "/start — Subscribe &amp; welcome message",
    "/status — System overview (vacancies, candidates, approvals)",
    "/pending — List pending requisition approvals",
    "/interviews — Upcoming interviews (next 7 days)",
    "/candidates — Recent 5 candidates",
    "/stop — Unsubscribe from notifications",
    "/help — Show this help message",
  ].join("\n");

  await sendTelegramMessage(chatId, msg);
}

async function handleStatus(chatId: number): Promise<void> {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      openVacancies,
      totalCandidates,
      pendingApprovals,
      interviewsToday,
      offersPending,
    ] = await Promise.all([
      prisma.vacancy.count({ where: { status: { in: ["approved", "open"] } } }),
      prisma.user.count({
        where: {
          userRoles: { some: { role: { slug: "candidate" } } },
          deletedAt: null,
        },
      }),
      prisma.approval.count({ where: { status: "PENDING" } }),
      prisma.interview.count({
        where: {
          status: "scheduled",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.offer.count({ where: { status: "sent" } }),
    ]);

    const msg = [
      "📊 <b>Nuanu ATS Status</b>",
      "",
      `📋 Open Vacancies: <b>${openVacancies}</b>`,
      `👥 Total Candidates: <b>${totalCandidates}</b>`,
      `⏳ Pending Approvals: <b>${pendingApprovals}</b>`,
      `📅 Interviews Today: <b>${interviewsToday}</b>`,
      `✅ Offers Pending: <b>${offersPending}</b>`,
      "",
      `<i>Last updated: ${nowWIB()} WIB</i>`,
    ].join("\n");

    await sendTelegramMessage(chatId, msg);
  } catch (err) {
    console.error("[Telegram] handleStatus error:", err);
    await sendTelegramMessage(chatId, "❌ Failed to fetch status. Please try again.");
  }
}

async function handlePending(chatId: number): Promise<void> {
  try {
    const pendingApprovals = await prisma.approval.findMany({
      where: { status: "PENDING" },
      include: {
        requisition: {
          include: {
            vacancy: { select: { title: true, departmentId: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { requisition: { createdAt: "asc" } },
      take: 10,
    });

    if (pendingApprovals.length === 0) {
      await sendTelegramMessage(chatId, "✅ No pending requisition approvals right now.");
      return;
    }

    const lines = ["⏳ <b>Pending Approvals</b>", ""];
    for (const approval of pendingApprovals) {
      lines.push(
        `• <b>${approval.requisition.vacancy.title}</b>`,
        `  Role: ${approval.role} | Approver: ${approval.approver.name}`,
        "",
      );
    }

    await sendTelegramMessage(chatId, lines.join("\n").trimEnd());
  } catch (err) {
    console.error("[Telegram] handlePending error:", err);
    await sendTelegramMessage(chatId, "❌ Failed to fetch pending approvals.");
  }
}

async function handleInterviews(chatId: number): Promise<void> {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const interviews = await prisma.interview.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { gte: now, lte: in7Days },
      },
      include: {
        application: {
          include: {
            candidate: { select: { name: true } },
            vacancy: { select: { title: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    });

    if (interviews.length === 0) {
      await sendTelegramMessage(chatId, "📅 No interviews scheduled in the next 7 days.");
      return;
    }

    const lines = ["📅 <b>Upcoming Interviews (Next 7 Days)</b>", ""];
    for (const iv of interviews) {
      lines.push(
        `• <b>${iv.application.candidate.name}</b>`,
        `  Position: ${iv.application.vacancy.title}`,
        `  Date: ${formatDate(iv.scheduledAt)} | Type: ${iv.type}`,
        `  Location: ${iv.location ?? "TBD"}`,
        "",
      );
    }

    await sendTelegramMessage(chatId, lines.join("\n").trimEnd());
  } catch (err) {
    console.error("[Telegram] handleInterviews error:", err);
    await sendTelegramMessage(chatId, "❌ Failed to fetch interviews.");
  }
}

async function handleCandidates(chatId: number): Promise<void> {
  try {
    const applications = await prisma.application.findMany({
      where: { deletedAt: null },
      include: {
        candidate: { select: { name: true, email: true } },
        vacancy: { select: { title: true } },
      },
      orderBy: { appliedAt: "desc" },
      take: 5,
    });

    if (applications.length === 0) {
      await sendTelegramMessage(chatId, "👥 No candidates found.");
      return;
    }

    const lines = ["👥 <b>Recent Candidates</b>", ""];
    for (const app of applications) {
      lines.push(
        `• <b>${app.candidate.name}</b>`,
        `  Applied for: ${app.vacancy.title}`,
        `  Stage: ${app.currentStage.replace(/_/g, " ")} | Status: ${app.status}`,
        `  Applied: ${formatDate(app.appliedAt)}`,
        "",
      );
    }

    await sendTelegramMessage(chatId, lines.join("\n").trimEnd());
  } catch (err) {
    console.error("[Telegram] handleCandidates error:", err);
    await sendTelegramMessage(chatId, "❌ Failed to fetch candidates.");
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message || body.edited_message;

    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const text: string = message.text || "";
    const username: string =
      message.from?.username ||
      message.from?.first_name ||
      "User";

    // Route commands
    if (text.startsWith("/start")) {
      await handleStart(chatId, username);
    } else if (text.startsWith("/stop")) {
      await handleStop(chatId);
    } else if (text.startsWith("/status")) {
      await handleStatus(chatId);
    } else if (text.startsWith("/pending")) {
      await handlePending(chatId);
    } else if (text.startsWith("/interviews")) {
      await handleInterviews(chatId);
    } else if (text.startsWith("/candidates")) {
      await handleCandidates(chatId);
    } else if (text.startsWith("/help")) {
      await handleHelp(chatId);
    } else if (text.trim() !== "") {
      // Unknown message — respond with help hint
      await sendTelegramMessage(
        chatId,
        "🤔 I didn't understand that. Send /help to see available commands.",
      );
    }
  } catch (err) {
    console.error("[Telegram] Webhook error:", err);
  }

  // Always return 200 so Telegram doesn't retry
  return NextResponse.json({ ok: true });
}
