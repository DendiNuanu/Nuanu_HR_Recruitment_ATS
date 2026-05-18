/**
 * POST /api/assessment/send
 * Generates a public assessment link and emails it to the candidate.
 * Auth required (HR/admin only).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assessmentId } = await request.json();
  if (!assessmentId) return NextResponse.json({ error: "assessmentId required" }, { status: 400 });

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      application: {
        include: {
          candidate: { select: { name: true, email: true } },
          vacancy: { select: { title: true } },
        },
      },
      publicLink: true,
    },
  });

  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  if (assessment.status === "completed") {
    return NextResponse.json({ error: "Assessment already completed" }, { status: 400 });
  }

  // Invalidate old link if exists
  if (assessment.publicLink) {
    await prisma.assessmentLink.delete({ where: { id: assessment.publicLink.id } });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.assessmentLink.create({
    data: { assessmentId, token, expiresAt },
  });

  // Update assessment status to pending (resend resets it)
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: "pending", startedAt: null, completedAt: null },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nuanu-hr-recruitment-ats.vercel.app";
  const assessmentUrl = `${appUrl}/assessment/${token}`;
  const candidate = assessment.application.candidate;
  const position = assessment.application.vacancy.title;
  const companyName = process.env.NEXT_PUBLIC_APP_NAME ?? "Nuanu";

  await sendEmail({
    to: candidate.email,
    subject: `Assessment Invitation — ${assessment.title}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">${companyName}</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600">HR Recruitment</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#0A1628;font-size:20px;font-weight:700">Assessment Invitation</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">Dear ${candidate.name},</p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">
            As part of your application for <strong>${position}</strong>, we'd like you to complete the following assessment:
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0A1628">${assessment.title}</p>
            ${assessment.description ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px">${assessment.description}</p>` : ""}
            ${assessment.expiresAt ? `<p style="margin:0;color:#94a3b8;font-size:13px">⏰ Expires: ${new Date(expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>` : ""}
          </div>
          <div style="text-align:center;margin:0 0 32px">
            <a href="${assessmentUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:15px">
              Start Assessment
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center">
            Or copy this link: <span style="color:#10B981;word-break:break-all">${assessmentUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} ${companyName} · Enterprise HR Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ success: true, assessmentUrl, token });
}
