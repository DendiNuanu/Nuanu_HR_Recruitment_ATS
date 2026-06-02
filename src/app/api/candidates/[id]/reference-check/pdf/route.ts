import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function hasManageAccess(roles: string[] = []) {
  const normalized = roles.map((role) => role.toLowerCase());
  return normalized.some((role) =>
    [
      "admin",
      "super-admin",
      "super_admin",
      "hr_manager",
      "hr",
      "recruiter",
    ].includes(role),
  );
}

function safe(value: string | null | undefined) {
  return value?.trim() ? value.trim() : "-";
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasManageAccess(session.roles)) {
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
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const textColor = rgb(0.12, 0.16, 0.22);
  const muted = rgb(0.42, 0.47, 0.54);
  const green = rgb(0, 0.78, 0.59);

  let page = doc.addPage([595, 842]);
  let y = 800;

  const ensureSpace = (spaceNeeded = 90) => {
    if (y > spaceNeeded) return;
    page = doc.addPage([595, 842]);
    y = 800;
  };

  const write = (
    text: string,
    x: number,
    size = 10,
    strong = false,
    color = textColor,
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: strong ? bold : regular,
      color,
    });
  };

  const sectionTitle = (title: string) => {
    ensureSpace(80);
    write(title, 48, 11, true, green);
    y -= 16;
  };

  const line = (label: string, value: string, indent = 48) => {
    ensureSpace(48);
    write(`${label}:`, indent, 9, true);
    write(value, indent + 122, 9, false);
    y -= 14;
  };

  write("Nuanu / Wooden Fish Village", 48, 16, true);
  y -= 20;
  write("REFERENCE CHECK & EMPLOYMENT VERIFICATION", 48, 11, true, green);
  y -= 26;
  write(`Applicant's Name: ${safe(candidate.candidate.name)}`, 48, 10);
  y -= 15;
  write(`Position Applied For: ${safe(candidate.vacancy?.title)}`, 48, 10);
  y -= 15;
  write(
    `Generated Date: ${new Date().toLocaleDateString("en-GB")}`,
    48,
    10,
    false,
    muted,
  );
  y -= 24;

  for (const item of referenceChecks) {
    sectionTitle(`REFERENCE ${item.referenceNo}`);

    line("Agency / Organization", safe(item.agencyName));
    line("Telephone", safe(item.telephone));
    line("City / State", safe(item.cityState));
    line("Job Title", safe(item.jobTitle));
    line(
      "Employment Date(s)",
      `${safe(item.employmentFrom)} → ${safe(item.employmentTo)}`,
    );
    line("Reason(s) for Leaving", safe(item.reasonForLeaving));
    line("Eligible for Rehire", safe(item.eligibleForRehire));
    line("Remarks", safe(item.rehireRemarks));
    line("Person Providing Information", safe(item.personProvidingInfo));
    line("Title", safe(item.personTitle));

    y -= 4;
    line("Work Performance", safe(item.workPerformance));
    line("Key Strengths", safe(item.strengths));
    line("Areas for Improvement", safe(item.areasToImprove));
    line("Additional Notes", safe(item.additionalNotes));
    line(
      "Overall Rating",
      item.overallRating ? `${item.overallRating}/5` : "-",
    );
    line("HR Recommendation", safe(item.recommendation));
    line("Conducted By", safe(item.conductor?.name));
    line(
      "Conducted At",
      item.conductedAt
        ? new Date(item.conductedAt).toLocaleDateString("en-GB")
        : "-",
    );
    y -= 10;
  }

  ensureSpace(50);
  page.drawLine({
    start: { x: 48, y: y + 10 },
    end: { x: 547, y: y + 10 },
    thickness: 1,
    color: rgb(0.88, 0.9, 0.92),
  });
  y -= 6;
  write(
    `Confidential – HR Internal Use Only · Generated ${new Date().toLocaleString("en-GB")}`,
    48,
    9,
    false,
    muted,
  );

  const pdfBuffer = Buffer.from(await doc.save());
  const safeName = candidate.candidate.name.replace(/\s+/g, "_");
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="RefCheck_${safeName}_${dateStamp}.pdf"`,
    },
  });
}
