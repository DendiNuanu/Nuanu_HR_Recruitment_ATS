import { Resend } from "resend";

export type EmailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: { filename: string; content: Buffer }[];
};

export type EmailResult =
  | { success: true; data: unknown }
  | { success: false; error: string; configMissing?: boolean };

/**
 * Professional email service using Resend.
 *
 * Requires the following env vars:
 *   RESEND_API_KEY  — get a free key at https://resend.com
 *   RESEND_FROM     — optional, defaults to "Nuanu Recruitment <onboarding@resend.dev>"
 *
 * When RESEND_API_KEY is absent the function returns
 * { success: false, configMissing: true } so callers can offer a mailto: fallback.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = process.env.RESEND_FROM || "Nuanu Recruitment <onboarding@resend.dev>",
  attachments,
}: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // ── Guard: missing or placeholder API key ─────────────────────────────────
  if (!apiKey || apiKey === "re_your_api_key_here" || apiKey.trim() === "") {
    console.warn(
      "[Email] RESEND_API_KEY is not configured. " +
        "Set it in Vercel → Settings → Environment Variables. " +
        "Get a free key at https://resend.com",
    );
    return {
      success: false,
      error: "Email service not configured",
      configMissing: true,
    };
  }

  // ── Build professional HTML if only plain text is supplied ────────────────
  const htmlContent =
    html ||
    (text
      ? `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px">Nuanu</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600">HR Recruitment</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <div style="color:#334155;font-size:15px;line-height:1.8;white-space:pre-wrap">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} Nuanu · Enterprise HR Platform · Bali, Indonesia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
      : "");

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || "",
      html: htmlContent,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return {
        success: false,
        error: (error as { message?: string }).message || "Resend API error",
      };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Sending failed:", message);
    return { success: false, error: message };
  }
}
