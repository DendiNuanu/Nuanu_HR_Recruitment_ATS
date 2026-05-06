import { NextResponse } from "next/server";
import { createRequisition, createRequisitionWithVacancy } from "@/lib/requisitionService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vacancyId, userId, isFullForm } = body;

    if (isFullForm) {
      // Handle the "Job Requisition Form" flow
      if (!body.title || !body.departmentId || !userId) {
        return NextResponse.json({ error: "Missing required fields for full form" }, { status: 400 });
      }

      const requisition = await createRequisitionWithVacancy({
        title: body.title,
        departmentId: body.departmentId,
        creatorId: userId,
        positionLevel: body.positionLevel,
        employmentType: body.employmentType,
        salaryMin: body.salaryMin ? parseFloat(body.salaryMin) : undefined,
        salaryMax: body.salaryMax ? parseFloat(body.salaryMax) : undefined,
        justificationType: body.justificationType,
        replacing: body.replacing,
        businessNeed: body.businessNeed,
        responsibilities: body.responsibilities || [],
        education: body.education,
        experienceYears: parseInt(body.experienceYears) || 0,
        requiredSkills: body.requiredSkills || [],
        certifications: body.certifications,
      });

      return NextResponse.json({ success: true, requisition });
    } else {
      // Handle the simple "Vacancy already exists" flow
      if (!vacancyId || !userId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const requisition = await createRequisition(vacancyId, userId);
      return NextResponse.json({ success: true, requisition });
    }
  } catch (error: any) {
    console.error("API Error (Requisition Create):", error);
    return NextResponse.json({ error: error.message || "Failed to create requisition" }, { status: 500 });
  }
}
