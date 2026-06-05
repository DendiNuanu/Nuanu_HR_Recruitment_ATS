import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import pdf from "html-pdf";
import fs from "fs";
import path from "path";

// Promisify html-pdf
const createPdf = (
  html: string,
  options: pdf.CreateOptions,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contract_id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contract_id } = await params;
  if (!contract_id) {
    return NextResponse.json(
      { error: "contract_id is required" },
      { status: 400 },
    );
  }

  try {
    const contract = await prisma.employeeContract.findUnique({
      where: { id: contract_id },
      include: {
        employee: {
          include: { user: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    if (contract.status !== "finalized") {
      return NextResponse.json(
        { error: "Cannot generate memo for draft contract" },
        { status: 400 },
      );
    }

    const currentYear = new Date().getFullYear();
    const prefix = `MH-${currentYear}-`;

    const lastMemo = await prisma.memoHire.findFirst({
      where: { memoNumber: { startsWith: prefix } },
      orderBy: { memoNumber: "desc" },
    });

    let nextIncrement = 1;
    if (lastMemo) {
      const lastSeq = parseInt(lastMemo.memoNumber.split("-")[2], 10);
      if (!isNaN(lastSeq)) {
        nextIncrement = lastSeq + 1;
      }
    }
    const memoNumber = `${prefix}${String(nextIncrement).padStart(3, "0")}`;
    const generationDate = new Date();

    // Read logo as base64 to ensure it loads in the PDF
    let logoBase64 = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "nuanu-logo.png");
      const logoData = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
    } catch (e) {
      console.warn("Could not load logo for PDF", e);
    }

    const basicSalary = Number(contract.basicSalary);
    const meal = Number(contract.mealAllowance);
    const transport = Number(contract.transportAllowance);
    const health = Number(contract.healthAllowance);
    const other = Number(contract.otherAllowanceAmount);
    const totalPackage = basicSalary + meal + transport + health + other;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header img { max-height: 60px; margin-bottom: 10px; }
        .title { font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
        .meta-info { display: flex; justify-content: space-between; margin-bottom: 40px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 6px 0; vertical-align: top; }
        .label { width: 200px; font-weight: bold; }
        .divider { border-top: 1px solid #ccc; margin: 20px 0; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .signature-block { width: 250px; text-align: center; }
        .signature-line { border-bottom: 1px solid #333; margin-top: 80px; margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Nuanu Logo" />` : "<h1>NUANU</h1>"}
        <div class="title">MEMO HIRE / EMPLOYMENT APPOINTMENT LETTER</div>
      </div>

      <div style="margin-bottom: 20px;">
        <table style="width: auto;">
          <tr><td style="width: 120px; font-weight: bold;">Memo Number</td><td>: ${memoNumber}</td></tr>
          <tr><td style="width: 120px; font-weight: bold;">Date</td><td>: ${formatDate(generationDate)}</td></tr>
        </table>
      </div>

      <p>Dear <strong>${contract.employee.user.name}</strong>,</p>
      <p>We are pleased to inform you of your employment details as follows:</p>

      <table>
        <tr><td class="label">Full Name</td><td>: ${contract.employee.user.name}</td></tr>
        <tr><td class="label">Position</td><td>: ${contract.employee.position}</td></tr>
        <tr><td class="label">Department</td><td>: ${contract.employee.department}</td></tr>
        <tr><td class="label">Employment Status</td><td>: ${contract.employmentType}</td></tr>
        <tr><td class="label">Start Date</td><td>: ${formatDate(contract.contractStart)}</td></tr>
        <tr><td class="label">Contract Period</td><td>: ${contract.isPermanent ? "Permanent" : `${formatDate(contract.contractStart)} to ${contract.contractEnd ? formatDate(contract.contractEnd) : "N/A"}`}</td></tr>
        <tr><td class="label">Work Location</td><td>: ${contract.workLocation}</td></tr>
        <tr><td class="label">Working Hours</td><td>: ${contract.workingHours}</td></tr>
        <tr><td class="label">Reporting To</td><td>: ${contract.reportingTo}</td></tr>
      </table>

      <h4 style="margin-bottom: 10px; margin-top: 30px; text-decoration: underline;">COMPENSATION PACKAGE</h4>
      <table>
        <tr><td class="label">Basic Salary</td><td>: ${formatCurrency(basicSalary)} (${contract.salaryType})</td></tr>
        ${meal > 0 ? `<tr><td class="label">Meal Allowance</td><td>: ${formatCurrency(meal)}</td></tr>` : ""}
        ${transport > 0 ? `<tr><td class="label">Transport Allowance</td><td>: ${formatCurrency(transport)}</td></tr>` : ""}
        ${health > 0 ? `<tr><td class="label">Health Allowance</td><td>: ${formatCurrency(health)}</td></tr>` : ""}
        ${other > 0 && contract.otherAllowanceLabel ? `<tr><td class="label">${contract.otherAllowanceLabel}</td><td>: ${formatCurrency(other)}</td></tr>` : ""}
      </table>

      <div class="divider"></div>
      <table>
        <tr><td class="label" style="font-size: 16px;">Total Package</td><td style="font-size: 16px; font-weight: bold;">: ${formatCurrency(totalPackage)}</td></tr>
      </table>

      <h4 style="margin-bottom: 10px; margin-top: 30px; text-decoration: underline;">FACILITIES</h4>
      <ul style="margin-top: 0; padding-left: 20px;">
        <li>Laptop: ${contract.laptopProvided ? `Yes — ${contract.laptopType || ""}` : "No"}</li>
        <li>Company Email: ${contract.companyEmail || "Not provided"}</li>
        <li>Lunch: ${contract.lunchProvided ? "Provided" : "Not provided"}</li>
        <li>Nametag: ${contract.nametagRequired ? "Required" : "Not required"}</li>
        <li>Access Card: ${contract.accessCard ? "Yes" : "No"}</li>
      </ul>

      ${
        contract.notes
          ? `
        <h4 style="margin-bottom: 5px; margin-top: 30px; text-decoration: underline;">NOTES</h4>
        <p style="margin-top: 0;">${contract.notes}</p>
      `
          : ""
      }

      <div class="footer" style="page-break-inside: avoid;">
        <div class="signature-block" style="float: left;">
          <p style="margin: 0; text-align: left;">Sincerely,</p>
          <div class="signature-line"></div>
          <p style="margin: 0;"><strong>HR Manager</strong></p>
          <p style="margin: 0;">Nuanu</p>
          <p style="margin-top: 20px; text-align: left;">Date: ________________</p>
        </div>
        <div class="signature-block" style="float: right;">
          <p style="margin: 0; text-align: left;">&nbsp;</p>
          <div class="signature-line"></div>
          <p style="margin: 0;"><strong>${contract.employee.user.name}</strong></p>
          <p style="margin: 0;">(Employee Signature)</p>
          <p style="margin-top: 20px; text-align: left;">Date: ________________</p>
        </div>
        <div style="clear: both;"></div>
      </div>
    </body>
    </html>
    `;

    // Ensure uploads directory exists
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "memo-hires",
    );
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfFilename = `${memoNumber}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);

    const pdfBuffer = await createPdf(html, {
      format: "A4",
      border: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    fs.writeFileSync(pdfPath, pdfBuffer);
    const pdfUrl = `/uploads/memo-hires/${pdfFilename}`;

    // Create DB record
    const memo = await prisma.memoHire.create({
      data: {
        employeeId: contract.employeeId,
        contractId: contract.id,
        memoNumber,
        pdfUrl,
        generatedBy: session.id,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: contract.employee.userId,
        action: `Generated Memo Hire ${memoNumber} for ${contract.employee.user.name}`,
        resource: "MemoHire",
        resourceId: memo.id,
      },
    });

    return NextResponse.json(
      {
        memo_id: memo.id,
        memo_number: memo.memoNumber,
        pdf_url: memo.pdfUrl,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Failed to generate memo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate memo" },
      { status: 500 },
    );
  }
}
