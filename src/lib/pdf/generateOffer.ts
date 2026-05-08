import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── Text wrapping helper ─────────────────────────────────────────────────────

function wrapText(text: string, maxChars: number): string[] {
  if (!text.trim()) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Handle words longer than maxChars by force-breaking
      if (word.length > maxChars) {
        let remaining = word;
        while (remaining.length > maxChars) {
          lines.push(remaining.slice(0, maxChars));
          remaining = remaining.slice(maxChars);
        }
        current = remaining;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateOfferPDF(data: {
  candidateName: string;
  vacancyTitle: string;
  salary: number;
  bonus?: number;
  benefits?: string;
  equity?: string;
  startDate: string;
  expiresAt?: string;
  companyName: string;
  notes?: string;
}) {
  const pdfDoc = await PDFDocument.create();
  // A4-ish portrait: 595 × 842 pt
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ── Colour palette ─────────────────────────────────────────────
  const navy = rgb(0.039, 0.078, 0.157); // #0A1428
  const emerald = rgb(0.039, 0.706, 0.49); // #0AB47D
  const midGray = rgb(0.35, 0.38, 0.45);
  const lightRule = rgb(0.88, 0.89, 0.92);
  const white = rgb(1, 1, 1);

  // ── Running Y cursor (starts below header) ─────────────────────
  let y = height;

  // ─────────────────────────────────────────────────────────────
  // HEADER BAND
  // ─────────────────────────────────────────────────────────────
  const headerH = 78;
  page.drawRectangle({
    x: 0,
    y: height - headerH,
    width,
    height: headerH,
    color: navy,
  });

  // Emerald accent strip
  page.drawRectangle({
    x: 0,
    y: height - headerH,
    width: 5,
    height: headerH,
    color: emerald,
  });

  page.drawText("JOB OFFER LETTER", {
    x: 24,
    y: height - 42,
    size: 20,
    font: bold,
    color: white,
  });
  page.drawText(data.companyName.toUpperCase(), {
    x: 24,
    y: height - 62,
    size: 9,
    font: bold,
    color: emerald,
  });

  // Date (right-aligned in header)
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const dateW = regular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, {
    x: width - dateW - 24,
    y: height - 52,
    size: 9,
    font: regular,
    color: rgb(0.7, 0.75, 0.85),
  });

  y = height - headerH - 28;

  // ─────────────────────────────────────────────────────────────
  // SALUTATION
  // ─────────────────────────────────────────────────────────────
  page.drawText(`Dear ${data.candidateName},`, {
    x: 40,
    y,
    size: 12,
    font: regular,
    color: navy,
  });
  y -= 22;

  // Opening paragraph
  const opening = `We are pleased to offer you the position of ${data.vacancyTitle} at ${data.companyName}. We were impressed by your skills and experience, and we believe you will be a valuable addition to our team.`;
  for (const line of wrapText(opening, 86)) {
    page.drawText(line, {
      x: 40,
      y,
      size: 10.5,
      font: regular,
      color: midGray,
    });
    y -= 16;
  }
  y -= 14;

  // ─────────────────────────────────────────────────────────────
  // SECTION: Terms of Employment
  // ─────────────────────────────────────────────────────────────
  const drawSectionHeading = (label: string) => {
    page.drawText(label, { x: 40, y, size: 12, font: bold, color: navy });
    y -= 5;
    page.drawLine({
      start: { x: 40, y },
      end: { x: bold.widthOfTextAtSize(label, 12) + 40, y },
      thickness: 2,
      color: emerald,
    });
    y -= 18;
  };

  const drawTermRow = (label: string, value: string) => {
    page.drawText(`${label}:`, {
      x: 52,
      y,
      size: 10,
      font: bold,
      color: midGray,
    });
    // Wrap long values
    const valueLines = wrapText(value, 55);
    page.drawText(valueLines[0] ?? "", {
      x: 200,
      y,
      size: 10,
      font: regular,
      color: navy,
    });
    y -= 17;
    for (let i = 1; i < valueLines.length; i++) {
      page.drawText(valueLines[i], {
        x: 200,
        y,
        size: 10,
        font: regular,
        color: navy,
      });
      y -= 17;
    }
  };

  drawSectionHeading("Terms of Employment");

  drawTermRow("Position", data.vacancyTitle);
  drawTermRow("Monthly Salary", `Rp ${data.salary.toLocaleString("id-ID")}`);
  if (data.bonus) {
    drawTermRow("Signing Bonus", `Rp ${data.bonus.toLocaleString("id-ID")}`);
  }
  drawTermRow(
    "Start Date",
    new Date(data.startDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );
  if (data.expiresAt) {
    drawTermRow(
      "Offer Valid Until",
      new Date(data.expiresAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    );
  }
  if (data.equity) {
    drawTermRow("Equity / Stock", data.equity);
  }

  y -= 8;

  // ─────────────────────────────────────────────────────────────
  // SECTION: Benefits (conditional)
  // ─────────────────────────────────────────────────────────────
  if (data.benefits && data.benefits.trim()) {
    drawSectionHeading("Benefits & Perks");

    const benefitLines = wrapText(data.benefits, 80);
    for (const line of benefitLines) {
      page.drawText(`•  ${line}`, {
        x: 52,
        y,
        size: 10,
        font: regular,
        color: midGray,
      });
      y -= 16;
    }
    y -= 8;
  }

  // ─────────────────────────────────────────────────────────────
  // SECTION: Additional Notes (conditional)
  // ─────────────────────────────────────────────────────────────
  if (data.notes && data.notes.trim()) {
    drawSectionHeading("Additional Notes");

    // Preserve newlines
    const rawLines = data.notes
      .split("\n")
      .flatMap((l) => (l.trim() ? wrapText(l, 80) : [""]));

    for (const line of rawLines) {
      page.drawText(line || " ", {
        x: 52,
        y,
        size: 10,
        font: regular,
        color: midGray,
      });
      y -= 16;
    }
    y -= 8;
  }

  // ─────────────────────────────────────────────────────────────
  // SECTION: Next Steps
  // ─────────────────────────────────────────────────────────────
  drawSectionHeading("Next Steps");

  const steps = [
    "To accept this offer, please sign and return this letter to our HR team via email.",
    ...(data.expiresAt
      ? [
          `This offer expires on ${new Date(data.expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}.`,
        ]
      : []),
    "We look forward to welcoming you to the Nuanu team.",
  ];

  for (const step of steps) {
    for (const line of wrapText(step, 84)) {
      page.drawText(line, {
        x: 52,
        y,
        size: 10,
        font: regular,
        color: midGray,
      });
      y -= 16;
    }
    y -= 4;
  }

  y -= 16;

  // ─────────────────────────────────────────────────────────────
  // FOOTER / SIGNATURE
  // ─────────────────────────────────────────────────────────────
  // Divider
  page.drawLine({
    start: { x: 40, y: y + 10 },
    end: { x: width - 40, y: y + 10 },
    thickness: 0.5,
    color: lightRule,
  });
  y -= 10;

  page.drawText("Sincerely,", {
    x: 40,
    y,
    size: 10,
    font: regular,
    color: midGray,
  });
  y -= 20;
  page.drawText("HR Department", {
    x: 40,
    y,
    size: 12,
    font: bold,
    color: navy,
  });
  y -= 16;
  page.drawText(data.companyName, {
    x: 40,
    y,
    size: 10,
    font: regular,
    color: emerald,
  });

  // Bottom accent bar
  page.drawRectangle({ x: 0, y: 0, width, height: 6, color: emerald });
  page.drawRectangle({ x: 0, y: 6, width, height: 2, color: navy });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
