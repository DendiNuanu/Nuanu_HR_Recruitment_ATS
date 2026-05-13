import { NextResponse } from "next/server";
import {
  createRequisition,
  createRequisitionWithVacancy,
} from "@/lib/requisitionService";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vacancyId, userId, isFullForm } = body;

    if (isFullForm) {
      // Handle the "Job Requisition Form" flow
      // Resolve departmentId: use provided id or find/create by name
      let resolvedDepartmentId: string = body.departmentId || "";

      if (!resolvedDepartmentId && body.departmentName) {
        // Find-or-create the department by name
        const existing = await prisma.department.findFirst({
          where: { name: { equals: body.departmentName, mode: "insensitive" } },
        });
        if (existing) {
          resolvedDepartmentId = existing.id;
        } else {
          const created = await prisma.department.create({
            data: {
              name: body.departmentName,
              code:
                body.departmentName
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 12) +
                "-" +
                Date.now().toString(36).toUpperCase(),
              budget: 0,
            },
          });
          resolvedDepartmentId = created.id;
        }
      }

      if (!body.title || !resolvedDepartmentId || !userId) {
        return NextResponse.json(
          { error: "Missing required fields for full form" },
          { status: 400 },
        );
      }

      const requisition = await createRequisitionWithVacancy({
        title: body.title,
        departmentId: resolvedDepartmentId,
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
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      const requisition = await createRequisition(vacancyId, userId);
      return NextResponse.json({ success: true, requisition });
    }
  } catch (error: any) {
    console.error("API Error (Requisition Create):", error);
    return NextResponse.json(
      { error: error.message || "Failed to create requisition" },
      { status: 500 },
    );
  }
}
