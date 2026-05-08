import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOfferPDF } from "@/lib/pdf/generateOffer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            vacancy: true,
          },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const pdfBuffer = await generateOfferPDF({
      candidateName: offer.application.candidate.name,
      vacancyTitle: offer.application.vacancy.title,
      salary: offer.salary,
      bonus: offer.bonus ?? undefined,
      benefits: offer.benefits ?? undefined,
      equity: offer.equity ?? undefined,
      startDate: offer.startDate?.toISOString() ?? new Date().toISOString(),
      expiresAt: offer.expiresAt?.toISOString() ?? undefined,
      companyName: "Nuanu",
      notes: offer.notes ?? undefined,
    });

    const safeName = offer.application.candidate.name.replace(/\s+/g, "_");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="offer_${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
