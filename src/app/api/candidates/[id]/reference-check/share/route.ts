import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

function hasManageAccess(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase());
  return normalized.some((role) =>
    ["admin", "super-admin", "super_admin", "hr_manager", "hr", "recruiter"].includes(role),
  );
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasManageAccess(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: applicationId } = await params;
  const body = (await req.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId?.trim();

  if (!userId) {
    return NextResponse.json({ error: "A user must be selected" }, { status: 400 });
  }

  const [application, selectedUser] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: { select: { name: true } },
        vacancy: { select: { title: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!application) {
    return NextResponse.json({ error: "Candidate application not found" }, { status: 404 });
  }
  if (!selectedUser) {
    return NextResponse.json({ error: "Selected user not found" }, { status: 404 });
  }

  const share = await prisma.referenceCheckShare.upsert({
    where: { applicationId },
    update: {
      sharedWithId: selectedUser.id,
      sharedById: session.id,
      sharedAt: new Date(),
      shareToken: randomUUID(),
      updatedAt: new Date(),
    },
    create: {
      applicationId,
      sharedWithId: selectedUser.id,
      sharedById: session.id,
      sharedAt: new Date(),
      shareToken: randomUUID(),
    },
    include: {
      sharedWith: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const link = `${appUrl}/dashboard/reference-checks/${applicationId}?token=${share.shareToken}`;
  const companyName = process.env.NEXT_PUBLIC_APP_NAME || "Nuanu";

  try {
    await sendEmail({
      to: selectedUser.email,
      subject: `Reference Check Results — ${application.candidate.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px;background:#f8fafc;">
          <div style="background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 8px;color:#00C896;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Reference Check Shared</p>
            <h2 style="margin:0;color:#0D1B2A;font-size:24px;">${application.candidate.name}</h2>
            <p style="margin:8px 0 0;color:#475569;font-size:15px;">Position: ${application.vacancy?.title ?? "N/A"}</p>
            <p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.7;">
              A completed reference check has been shared with you from ${companyName}. Use the link below to review the results in read-only mode.
            </p>
            <div style="margin-top:24px;">
              <a href="${link}" style="display:inline-block;background:#00C896;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">Open Reference Check</a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">If the button does not work, copy and paste this URL into your browser:<br>${link}</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.warn("[reference-check/share] Failed to send share email:", error);
  }

  return NextResponse.json({
    sharedStatus: {
      sharedAt: share.sharedAt.toISOString(),
      sharedWith: share.sharedWith,
    },
  });
}
