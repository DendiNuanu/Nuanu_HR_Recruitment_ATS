import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const employee_id = formData.get("employee_id") as string;
    const onboarding_id = formData.get("onboarding_id") as string;
    const document_type = formData.get("document_type") as string;
    const file = formData.get("file") as File | null;

    if (!employee_id || !onboarding_id || !document_type || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and PDF are allowed" }, { status: 400 });
    }

    // Get employee info for renaming
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeName = employee.user.name.replace(/\s+/g, "_");
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    const newFilename = `${document_type}-${employeeName}-${timestamp}.${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, newFilename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/documents/${newFilename}`;

    // Create or Update Document
    const document = await prisma.employeeDocument.upsert({
      where: {
        employeeId_documentType: {
          employeeId: employee_id,
          documentType: document_type,
        }
      },
      update: {
        originalFilename: file.name,
        storedFilename: newFilename,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        verificationStatus: "uploaded",
        rejectionReason: null, // Clear on re-upload
        uploadedAt: new Date(),
        verifiedAt: null,
        verifiedBy: null
      },
      create: {
        employeeId: employee_id,
        onboardingId: onboarding_id,
        documentType: document_type,
        originalFilename: file.name,
        storedFilename: newFilename,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        verificationStatus: "uploaded"
      }
    });

    return NextResponse.json({
      document_id: document.id,
      file_url: document.fileUrl,
      status: document.verificationStatus
    }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
