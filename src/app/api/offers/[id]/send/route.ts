import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      application: {
        include: {
          candidate: { select: { name: true, email: true } },
          vacancy: { select: { title: true } },
        },
      },
    },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const candidate = offer.application.candidate;
  const position = offer.application.vacancy.title;
  const companyName = process.env.NEXT_PUBLIC_APP_NAME ?? "Nuanu";

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  await sendEmail({
    to: candidate.email,
    subject: `Job Offer — ${position} at ${companyName}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#0A1628,#0D2040);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">${companyName}</h1>
          <p style="margin:6px 0 0;color:rgba(16,185,129,0.8);font-size:11px;letter-spacing:3px;text-transform:uppercase">HR Recruitment</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#0A1628;font-size:20px;font-weight:700">Congratulations, ${candidate.name}!</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">
            We are delighted to offer you the position of <strong>${position}</strong> at ${companyName}.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
            <p style="margin:0 0 8px;font-size:14px;color:#64748b"><strong>Position:</strong> ${position}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#64748b"><strong>Salary:</strong> ${formatIDR(offer.salary)} / month</p>
            ${offer.startDate ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b"><strong>Start Date:</strong> ${new Date(offer.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>` : ""}
            ${offer.benefits ? `<p style="margin:0;font-size:14px;color:#64748b"><strong>Benefits:</strong> ${offer.benefits}</p>` : ""}
          </div>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px">
            Please review the offer details and confirm your acceptance by replying to this email or contacting our HR team.
            ${offer.expiresAt ? `This offer expires on <strong>${new Date(offer.expiresAt).toLocaleDateString("en-GB")}</strong>.` : ""}
          </p>
          <p style="color:#475569;font-size:15px;margin:0">
            We look forward to welcoming you to the team!<br><br>
            <strong>${companyName} Recruitment Team</strong>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
          <p style="margin:0;color:#94a3b8;font-size:12px">© ${new Date().getFullYear()} ${companyName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  await prisma.offer.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
