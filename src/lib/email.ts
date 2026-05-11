import nodemailer from "nodemailer";
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

// ─────────────────────────────────────────────────────────────────────────────
// Professional HTML wrapper (used when only plain text is supplied)
// ─────────────────────────────────────────────────────────────────────────────
function wrapInHtml(text: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px">Nuanu</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600">HR Recruitment</p>
        </td></tr>
        <tr><td style="padding:40px">
          <div style="color:#334155;font-size:15px;line-height:1.8;white-space:pre-wrap">${text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</div>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} Nuanu · Enterprise HR Platform · Bali, Indonesia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 1 — Gmail SMTP via Nodemailer
//
// Required env vars:
//   GMAIL_USER         e.g.  hr@nuanu.com  or  dendi@gmail.com
//   GMAIL_APP_PASSWORD  16-char app password from
//                       https://myaccount.google.com/apppasswords
//                       (requires 2-Step Verification to be enabled first)
//
// This provider sends to ANY email address — no domain verification needed.
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaGmail(
  opts: EmailOptions & { fromDisplay: string },
): Promise<EmailResult> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    return {
      success: false,
      error:
        "Gmail SMTP not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)",
      configMissing: true,
    };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const htmlContent = opts.html || (opts.text ? wrapInHtml(opts.text) : "");

  try {
    const info = await transporter.sendMail({
      from: `${opts.fromDisplay} <${user}>`,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      text: opts.text || "",
      html: htmlContent,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    console.log("[Email] Sent via Gmail SMTP:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Email] Gmail SMTP error:", message);
    return { success: false, error: `Gmail SMTP error: ${message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 2 — Resend
//
// Required env vars:
//   RESEND_API_KEY  — get a free key at https://resend.com
//   RESEND_FROM     — MUST be an @yourdomain.com address after you verify your
//                     domain at https://resend.com/domains
//
// ⚠️  The shared @resend.dev test domain can ONLY deliver to the Resend
//     account owner's email address.  To send to any recipient you must verify
//     your own domain and set RESEND_FROM to use it.
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaResend(opts: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEnv = process.env.RESEND_FROM?.trim();

  if (!apiKey || apiKey === "re_your_api_key_here") {
    return {
      success: false,
      error: "Resend API key not configured",
      configMissing: true,
    };
  }

  // Guard: warn loudly when still using the test domain
  if (!fromEnv || fromEnv.includes("@resend.dev")) {
    return {
      success: false,
      error:
        "Resend is configured with the @resend.dev test domain which can only " +
        "deliver to your own account email. Verify your domain at " +
        "https://resend.com/domains and set RESEND_FROM=noreply@yourdomain.com",
      configMissing: true,
    };
  }

  const htmlContent = opts.html || (opts.text ? wrapInHtml(opts.text) : "");

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: opts.from || fromEnv,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      text: opts.text || "",
      html: htmlContent,
      attachments: opts.attachments?.map((a) => ({
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

    console.log("[Email] Sent via Resend:", (data as any)?.id);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Email] Resend error:", message);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — tries Gmail SMTP first, then Resend.
//
// Priority order:
//   1. Gmail SMTP  (GMAIL_USER + GMAIL_APP_PASSWORD)  ← works for any recipient
//   2. Resend      (RESEND_API_KEY + RESEND_FROM with verified domain)
//
// If neither is configured the call returns { success: false, configMissing: true }
// so callers can surface a helpful message instead of silently failing.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from,
  attachments,
}: EmailOptions): Promise<EmailResult> {
  const displayName = "Nuanu Recruitment";
  const opts: EmailOptions & { fromDisplay: string } = {
    to,
    subject,
    text,
    html,
    from,
    attachments,
    fromDisplay: displayName,
  };

  // ── Attempt 1: Gmail SMTP ─────────────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (gmailUser && gmailPass) {
    const result = await sendViaGmail(opts);
    if (result.success) return result;
    // If it failed for a real reason (not just missing config) → surface the error
    if (!result.configMissing) return result;
  }

  // ── Attempt 2: Resend (only if domain is verified) ───────────────────────
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM?.trim();

  if (resendKey && resendFrom && !resendFrom.includes("@resend.dev")) {
    const result = await sendViaResend(opts);
    if (result.success) return result;
    if (!result.configMissing) return result;
  }

  // ── Nothing configured ────────────────────────────────────────────────────
  console.warn(
    "[Email] No working email provider found.\n" +
      "  Option A (recommended): Add GMAIL_USER + GMAIL_APP_PASSWORD to your environment variables.\n" +
      "  Option B: Verify your domain at https://resend.com/domains and set RESEND_FROM=noreply@yourdomain.com",
  );

  return {
    success: false,
    configMissing: true,
    error:
      "Email delivery is not configured. " +
      "Add GMAIL_USER + GMAIL_APP_PASSWORD in Vercel → Settings → Environment Variables.",
  };
}
