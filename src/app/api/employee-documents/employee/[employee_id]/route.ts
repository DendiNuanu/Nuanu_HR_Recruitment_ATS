import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const REQUIRED_DOCS = [
  "ktp",
  "kk",
  "npwp",
  "bpjs_kesehatan",
  "bpjs_ketenagakerjaan",
  "ijazah",
  "formal_photo",
  "bank_account"
];

export async function GET(
  request: Request,
  { params }: { params: { employee_id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employee_id } = params;
  if (!employee_id) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  try {
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: employee_id },
    });

    // We want to return an array of exactly 8 slots, matching REQUIRED_DOCS.
    // If a document isn't found, return a null/empty object for that slot.
    const slots = REQUIRED_DOCS.map(type => {
      const doc = documents.find(d => d.documentType === type);
      if (doc) return doc;
      
      return {
        id: null,
        documentType: type,
        verificationStatus: "missing",
        fileUrl: null,
        rejectionReason: null,
      };
    });

    return NextResponse.json({ documents: slots }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
