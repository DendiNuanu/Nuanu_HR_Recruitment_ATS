import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";

/**
 * GET /api/telegram/setup
 *
 * Registers the webhook URL with Telegram. Call this once after deploying
 * to Vercel (or any public URL). You can hit it in the browser or with curl:
 *
 *   curl https://your-domain.vercel.app/api/telegram/setup
 */
export async function GET(req: Request) {
  try {
    // Derive the base URL from the incoming request so it works on any deployment
    const requestUrl = new URL(req.url);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    const webhookUrl = `${baseUrl}/api/telegram/webhook`;

    const result = await setWebhook(webhookUrl);

    return NextResponse.json({
      ok: true,
      webhookUrl,
      telegramResponse: result,
    });
  } catch (err) {
    console.error("[Telegram] Setup error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
