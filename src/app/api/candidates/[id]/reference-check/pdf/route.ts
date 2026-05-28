import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function canManageReferenceChecks(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase());
  return normalized.some((role) =>
    ["admin", "hr_manager", "hr", "recruiter"].includes(role),
  );
}

function safe(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageReferenceChecks(session.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: candidateId } = await params;

  const candidate = await prisma.application.findUnique({
    where: { id: candidateId },
    select: {
      vacancy: { select: { title: true } },
      candidate: { select: { name: true, email: true } },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const referenceChecks = await prisma.referenceCheck.findMany({
    where: { candidateId },
    orderBy: { referenceNo: "asc" },
    include: { conductor: { select: { name: true } } },
  });

  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.12, 0.12, 0.12);

  let y = 805;
  const write = (text: string, x: number, size = 10, strong = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: strong ? bold : regular,
      color: dark,
    });
  };

  write("Wooden Fish Village", 50, 16, true);
  y -= 18;
  write("REFERENCE CHECK & EMPLOYMENT VERIFICATION", 50, 11, true);
  y -= 24;
  write(`Applicant's Name: ${safe(candidate.candidate.name)}`, 50, 10);
  y -= 14;
  write(`Position Applied For: ${safe(candidate.vacancy?.title)}`, 50, 10);
  y -= 20;

  for (const item of referenceChecks) {
    write(`REFERENCE ${item.referenceNo}`, 50, 11, true);
    y -= 14;
    write(`Agency/Organization: ${safe(item.agencyName)}`, 50);
    y -= 13;
    write(`Telephone: ${safe(item.telephone)}   City/State: ${safe(item.cityState)}`, 50);
    y -= 13;
    write(`Job Title: ${safe(item.jobTitle)}`, 50);
    y -= 13;
    write(`Employment Dates: From ${safe(item.employmentFrom)} To ${safe(item.employmentTo)}`, 50);
    y -= 13;
    write(`Reason for Leaving: ${safe(item.reasonForLeaving)}`, 50);
    y -= 13;
    write(`Eligible for Rehire: ${safe(item.eligibleForRehire)}   Remarks: ${safe(item.rehireRemarks)}`, 50);
    y -= 13;
    write(`Person Providing Info: ${safe(item.personProvidingInfo)}   Title: ${safe(item.personTitle)}`, 50);
    y -= 13;
    write(`Overall Rating: ${item.overallRating ?? "-"}   Recommendation: ${safe(item.recommendation)}`, 50);
    y -= 13;
    write(`Conducted by: ${safe(item.conductor?.name)} · Date: ${item.conductedAt ? new Date(item.conductedAt).toLocaleDateString("en-GB") : "-"}`, 50);
    y -= 20;

    if (y < 120) {
      y = 805;
      page = doc.addPage([595, 842]);
    }
  }

  write("CONFIDENTIAL", 50, 9, true);

  const pdfBuffer = Buffer.from(await doc.save());
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"RefCheck_${candidate.candidate.name.replace(/\s+/g, "_")}.pdf\"`,
    },
  });
}
