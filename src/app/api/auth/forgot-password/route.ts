/**
 * POST /api/auth/forgot-password
 * Generates a secure reset token and emails it to the user.
 * Rate-limited: max 3 requests per email per hour (checked via DB).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      // Rate limit: max 3 tokens in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentTokens = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (recentTokens < 3) {
        // Invalidate any existing unused tokens
        await prisma.passwordResetToken.updateMany({
          where: { userId: user.id, used: false },
          data: { used: true },
        });

        // Generate a cryptographically secure token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
          data: { userId: user.id, token, expiresAt },
        });

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://nuanu-hr-recruitment-ats.vercel.app";
        const resetUrl = `${appUrl}/reset-password/${token}`;

        await sendEmail({
          to: user.email,
          subject: "Reset Your Nuanu ATS Password",
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">Nuanu</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600">HR Recruitment</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#0A1628;font-size:20px;font-weight:700">Password Reset Request</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px">Hi ${user.name},</p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 32px">
            We received a request to reset your password for your Nuanu HR ATS account.
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align:center;margin:0 0 32px">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.3px">
              Reset My Password
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0">
            Or copy this link: <span style="color:#10B981;word-break:break-all">${resetUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} Nuanu · Enterprise HR Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
      }
    }

    // Always return the same response
    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
