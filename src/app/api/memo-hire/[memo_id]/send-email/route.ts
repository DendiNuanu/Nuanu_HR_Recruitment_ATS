import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import fs from "fs";
import path from "path";

export async function POST(
  request: Request,
  { params }: { params: { memo_id: string } },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memo_id } = params;
  if (!memo_id) {
    return NextResponse.json({ error: "memo_id is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { to_email, subject, message } = body;

    if (!to_email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const memo = await prisma.memoHire.findUnique({
      where: { id: memo_id },
      include: {
        employee: { include: { user: true } },
      },
    });

    if (!memo) {
      return NextResponse.json({ error: "Memo not found" }, { status: 404 });
    }

    const pdfFilename = path.basename(memo.pdfUrl);
    const pdfPath = path.join(process.cwd(), "public", memo.pdfUrl);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: "PDF file not found on disk" }, { status: 404 });
    }

    const pdfBuffer = fs.readFileSync(pdfPath);

    const result = await sendEmail({
      to: to_email,
      subject,
      text: message,
      html: message.replace(/\n/g, "<br>"),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
    });

    if (result.success) {
      const updated = await prisma.memoHire.update({
        where: { id: memo_id },
        data: {
          sentAt: new Date(),
          sentToEmail: to_email,
        },
      });

      return NextResponse.json({ sent: true, sent_at: updated.sentAt }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Failed to send memo email:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
