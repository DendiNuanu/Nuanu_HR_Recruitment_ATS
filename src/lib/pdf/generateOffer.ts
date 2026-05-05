import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateOfferPDF(data: {
  candidateName: string;
  vacancyTitle: string;
  salary: number;
  startDate: string;
  companyName: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText("JOB OFFER LETTER", {
    x: 50,
    y: height - 100,
    size: 24,
    font: boldFont,
    color: rgb(0.06, 0.08, 0.15), // Nuanu Navy
  });

  page.drawText(data.companyName, {
    x: 50,
    y: height - 130,
    size: 14,
    font: boldFont,
    color: rgb(0.06, 0.72, 0.5), // Nuanu Emerald
  });

  const date = new Date().toLocaleDateString();
  page.drawText(`Date: ${date}`, { x: 50, y: height - 170, size: 10, font });

  // Body
  const bodyY = height - 220;
  page.drawText(`Dear ${data.candidateName},`, { x: 50, y: bodyY, size: 12, font });

  const text = `We are pleased to offer you the position of ${data.vacancyTitle} at ${data.companyName}. We were very impressed with your skills and experience, and we believe you will be a valuable addition to our team.`;
  
  // Basic text wrapping (manual for now to avoid extra deps)
  page.drawText(text.substring(0, 85), { x: 50, y: bodyY - 40, size: 11, font });
  page.drawText(text.substring(85), { x: 50, y: bodyY - 55, size: 11, font });

  page.drawText("Terms of Employment:", { x: 50, y: bodyY - 100, size: 12, font: boldFont });
  
  page.drawText(`- Position: ${data.vacancyTitle}`, { x: 70, y: bodyY - 130, size: 11, font });
  page.drawText(`- Annual Salary: Rp ${data.salary.toLocaleString()}`, { x: 70, y: bodyY - 150, size: 11, font });
  page.drawText(`- Start Date: ${new Date(data.startDate).toLocaleDateString()}`, { x: 70, y: bodyY - 170, size: 11, font });

  page.drawText("Next Steps:", { x: 50, y: bodyY - 220, size: 12, font: boldFont });
  page.drawText("To accept this offer, please sign and return this letter by email.", { x: 50, y: bodyY - 250, size: 11, font });

  page.drawText("Sincerely,", { x: 50, y: bodyY - 320, size: 11, font });
  page.drawText("HR Department", { x: 50, y: bodyY - 350, size: 11, font: boldFont });
  page.drawText(data.companyName, { x: 50, y: bodyY - 365, size: 11, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
