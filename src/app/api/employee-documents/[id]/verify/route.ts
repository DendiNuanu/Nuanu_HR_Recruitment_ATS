import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "document id is required" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { action, rejection_reason } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && !rejection_reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 },
      );
    }

    const doc = await prisma.employeeDocument.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    let updatedDoc;
    if (action === "approve") {
      updatedDoc = await prisma.employeeDocument.update({
        where: { id },
        data: {
          verificationStatus: "verified",
          verifiedAt: new Date(),
          verifiedBy: session.id,
          rejectionReason: null,
        },
      });
    } else {
      updatedDoc = await prisma.employeeDocument.update({
        where: { id },
        data: {
          verificationStatus: "rejected",
          verifiedAt: null,
          verifiedBy: null,
          rejectionReason: rejection_reason,
        },
      });
    }

    // Check if all 8 are verified
    const allDocs = await prisma.employeeDocument.findMany({
      where: { employeeId: doc.employeeId },
    });

    const verifiedDocs = allDocs.filter(
      (d) => d.verificationStatus === "verified",
    );
    const verifiedCount = verifiedDocs.length;
    let allVerified = false;

    if (verifiedCount >= 8) {
      allVerified = true;
      // Update onboarding status to asset_setup
      await prisma.onboarding.updateMany({
        where: { employeeId: doc.employeeId },
        data: { onboardingStatus: "asset_setup" },
      });
    }

    return NextResponse.json(
      {
        updated: true,
        all_verified: allVerified,
        verified_count: verifiedCount,
        document: updatedDoc,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Failed to verify document:", error);
    return NextResponse.json(
      { error: "Failed to verify document" },
      { status: 500 },
    );
  }
}
