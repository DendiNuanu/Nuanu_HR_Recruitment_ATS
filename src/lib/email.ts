/**
 * Nuanu ATS — Universal Email Service
 *
 * Tries every configured provider in order until one succeeds:
 *   1. Generic SMTP  (SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS)
 *   2. Gmail SMTP   (GMAIL_USER + GMAIL_APP_PASSWORD)
 *   3. Resend API   (RESEND_API_KEY)  — works even with @resend.dev for testing
 *
 * Set ANY ONE of these three groups in Vercel Environment Variables.
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── HTML wrapper ─────────────────────────────────────────────────────────────

function wrapInHtml(text: string): string {
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
          <div style="color:#334155;font-size:15px;line-height:1.8;white-space:pre-wrap">${safe}</div>
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

// ─── Helper: build nodemailer message ────────────────────────────────────────

function buildMailOptions(
  opts: EmailOptions,
  fromAddress: string,
  displayName = "Nuanu Recruitment",
) {
  return {
    from: `${displayName} <${fromAddress}>`,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    text: opts.text ?? "",
    html: opts.html ?? (opts.text ? wrapInHtml(opts.text) : ""),
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider 0 — Database SMTP (configured via Settings UI — highest priority)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaDbSmtp(opts: EmailOptions): Promise<EmailResult> {
  try {
    const row = await prisma.integration.findUnique({
      where: { name: "email_smtp" },
    });
    if (!row || !row.isActive)
      return {
        success: false,
        configMissing: true,
        error: "DB SMTP not configured",
      };
    const c = row.config as any;
    if (!c.host || !c.user || !c.pass)
      return {
        success: false,
        configMissing: true,
        error: "DB SMTP incomplete",
      };

    const port = parseInt(c.port ?? "587", 10);
    const secure = port === 465;
    const transporter = nodemailer.createTransport({
      host: c.host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user: c.user, pass: c.pass.replace(/\s+/g, "") },
      tls: { rejectUnauthorized: false }, // allow self-signed for flexibility
    });

    try {
      await transporter.verify();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: `DB SMTP auth failed: ${msg}` };
    }

    const fromAddr = c.from || c.user;
    const info = await transporter.sendMail(buildMailOptions(opts, fromAddr));
    console.log("[Email] Sent via DB SMTP:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `DB SMTP error: ${msg}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider A — Generic SMTP
//
// Works with: Gmail, Outlook, Zoho, Yahoo, any SMTP server.
//
// Required env vars:
//   SMTP_HOST   e.g. smtp.gmail.com | smtp-mail.outlook.com | smtp.zoho.com
//   SMTP_PORT   e.g. 587 (STARTTLS) or 465 (SSL)
//   SMTP_USER   your email address
//   SMTP_PASS   your password or App Password
//   SMTP_FROM   (optional) display address, defaults to SMTP_USER
//
// Quick-start examples:
//   Gmail:   SMTP_HOST=smtp.gmail.com  PORT=587  USER=you@gmail.com
//            PASS=xxxx-xxxx-xxxx-xxxx  (App Password — no spaces needed here,
//            code strips them automatically)
//   Outlook: SMTP_HOST=smtp-mail.outlook.com  PORT=587  USER=you@outlook.com
//            PASS=your_password
//   Zoho:    SMTP_HOST=smtp.zoho.com  PORT=587  USER=you@zoho.com
//            PASS=your_password
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaSmtp(opts: EmailOptions): Promise<EmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER?.trim();
  // Strip ALL whitespace — covers Gmail App Password with spaces
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const fromEnv = process.env.SMTP_FROM?.trim() || user;

  if (!host || !user || !pass)
    return {
      success: false,
      configMissing: true,
      error: "SMTP not configured",
    };

  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });

  try {
    await transporter.verify();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/SMTP] verify failed:", msg);
    return { success: false, error: `SMTP auth failed: ${msg}` };
  }

  try {
    const info = await transporter.sendMail(buildMailOptions(opts, fromEnv!));
    console.log("[Email] Sent via generic SMTP:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/SMTP] sendMail failed:", msg);
    return { success: false, error: `SMTP send failed: ${msg}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider B — Gmail SMTP (dedicated shorthand)
//
// Required env vars:
//   GMAIL_USER          your Gmail or Google Workspace address
//   GMAIL_APP_PASSWORD  16-char App Password from
//                       https://myaccount.google.com/apppasswords
//                       Paste with or without spaces — stripped automatically.
//
// NOTE: Requires 2-Step Verification on the Google account.
// For Google Workspace: admin must allow App Passwords in Admin Console.
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaGmail(opts: EmailOptions): Promise<EmailResult> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass)
    return {
      success: false,
      configMissing: true,
      error: "Gmail not configured",
    };

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });

  try {
    await transporter.verify();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/Gmail] verify failed:", msg);
    if (
      msg.includes("535") ||
      msg.includes("BadCredentials") ||
      msg.includes("Invalid login")
    ) {
      return {
        success: false,
        error:
          "Gmail 535: Wrong App Password. Re-generate at https://myaccount.google.com/apppasswords " +
          "and update GMAIL_APP_PASSWORD in Vercel. Paste with or without spaces — both work.",
      };
    }
    return { success: false, error: `Gmail SMTP failed: ${msg}` };
  }

  try {
    const info = await transporter.sendMail(buildMailOptions(opts, user));
    console.log("[Email] Sent via Gmail SMTP:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/Gmail] sendMail failed:", msg);
    return { success: false, error: `Gmail send failed: ${msg}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider C — Resend API
//
// Required env vars:
//   RESEND_API_KEY  your Resend key
//   RESEND_FROM     (optional) from address
//
// Without a verified domain, Resend can only deliver to your own account email.
// Set RESEND_FROM=noreply@yourdomain.com AFTER verifying at resend.com/domains.
// Used as fallback even without domain verification (will at least log the attempt).
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaResend(opts: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey === "re_your_api_key_here") {
    return {
      success: false,
      configMissing: true,
      error: "Resend not configured",
    };
  }

  const fromEnv =
    process.env.RESEND_FROM?.trim() ||
    "Nuanu Recruitment <onboarding@resend.dev>";

  const htmlContent = opts.html ?? (opts.text ? wrapInHtml(opts.text) : "");

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: opts.from ?? fromEnv,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      text: opts.text ?? "",
      html: htmlContent,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      const msg = (error as { message?: string }).message ?? "Resend error";
      console.error("[Email/Resend] API error:", msg);
      // If it's the test-domain restriction, return a meaningful error
      if (
        msg.includes("testing") ||
        msg.includes("own email") ||
        msg.includes("verify a domain")
      ) {
        return {
          success: false,
          error:
            "Resend: domain not verified. To send to any recipient, " +
            "verify your domain at https://resend.com/domains and set " +
            "RESEND_FROM=noreply@yourdomain.com in Vercel.",
        };
      }
      return { success: false, error: msg };
    }

    console.log("[Email] Sent via Resend:", (data as any)?.id);
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Email/Resend] exception:", msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
//
// Tries every configured provider in sequence.
// Returns the first success, or the last meaningful error.
// Never silently swallows failures.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  const errors: string[] = [];

  // ── Provider 0: Database SMTP (Settings UI) ───────────────────────────────
  const dbResult = await sendViaDbSmtp(opts);
  if (dbResult.success) return dbResult;
  if (!dbResult.configMissing) errors.push(`DB-SMTP: ${dbResult.error}`);

  // ── Provider A: Generic SMTP ─────────────────────────────────────────────
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const r = await sendViaSmtp(opts);
    if (r.success) return r;
    if (!r.configMissing) errors.push(`SMTP: ${r.error}`);
  }

  // ── Provider B: Gmail ────────────────────────────────────────────────────
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const r = await sendViaGmail(opts);
    if (r.success) return r;
    if (!r.configMissing) errors.push(`Gmail: ${r.error}`);
  }

  // ── Provider C: Resend (always try if key present) ───────────────────────
  if (process.env.RESEND_API_KEY) {
    const r = await sendViaResend(opts);
    if (r.success) return r;
    errors.push(`Resend: ${r.error}`);
  }

  // ── Nothing worked ────────────────────────────────────────────────────────
  if (errors.length > 0) {
    // At least one provider was tried — return its error
    const combined = errors.join(" | ");
    console.error("[Email] All providers failed:", combined);
    return { success: false, error: combined };
  }

  // No provider configured at all
  console.warn(
    "[Email] No provider configured. Add one of these to Vercel env vars:\n" +
      "  Option 1 — Generic SMTP:  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS\n" +
      "  Option 2 — Gmail:         GMAIL_USER, GMAIL_APP_PASSWORD\n" +
      "  Option 3 — Resend:        RESEND_API_KEY (+ RESEND_FROM after domain verify)",
  );

  return {
    success: false,
    configMissing: true,
    error: "No email provider is configured in environment variables.",
  };
}
