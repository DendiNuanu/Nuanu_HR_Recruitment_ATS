import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year + 1}-01-01`);

  const apps = await prisma.application.findMany({
    where: { deletedAt: null, createdAt: { gte: startDate, lt: endDate } },
    select: { candidateId: true, currentStage: true, status: true },
  });

  const candidateIds = [...new Set(apps.map((a) => a.candidateId))];
  const profiles = await prisma.candidateProfile.findMany({
    where: { userId: { in: candidateIds } },
    select: { userId: true, gender: true, dateOfBirth: true, location: true },
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const now = new Date();

  const genderMap = new Map<string, { applicants: number; hires: number }>();
  const locationMap = new Map<string, { applicants: number; hires: number }>();
  const ageMap = new Map<string, { applicants: number; hires: number }>();

  for (const app of apps) {
    const profile = profileMap.get(app.candidateId);
    const isHired = app.currentStage === "hired" || app.status === "hired";

    // Gender
    const g = (profile?.gender ?? "not_specified").toLowerCase();
    const gLabel = g === "male" ? "Male" : g === "female" ? "Female" : g === "other" ? "Other" : "Not Specified";
    const ge = genderMap.get(gLabel) ?? { applicants: 0, hires: 0 };
    ge.applicants++;
    if (isHired) ge.hires++;
    genderMap.set(gLabel, ge);

    // Location
    const loc = (profile?.location ?? "Unknown").trim();
    const le = locationMap.get(loc) ?? { applicants: 0, hires: 0 };
    le.applicants++;
    if (isHired) le.hires++;
    locationMap.set(loc, le);

    // Age
    let ageLabel = "Unknown";
    if (profile?.dateOfBirth) {
      const ageYears = (now.getTime() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 86_400_000);
      if (ageYears < 25) ageLabel = "Under 25";
      else if (ageYears < 35) ageLabel = "25–34";
      else if (ageYears < 45) ageLabel = "35–44";
      else if (ageYears < 55) ageLabel = "45–54";
      else ageLabel = "55+";
    }
    const ae = ageMap.get(ageLabel) ?? { applicants: 0, hires: 0 };
    ae.applicants++;
    if (isHired) ae.hires++;
    ageMap.set(ageLabel, ae);
  }

  const toArray = (map: Map<string, { applicants: number; hires: number }>) =>
    Array.from(map.entries()).map(([label, d]) => ({ label, ...d })).sort((a, b) => b.applicants - a.applicants);

  return NextResponse.json({
    year,
    gender: toArray(genderMap),
    location: toArray(locationMap).slice(0, 20),
    age: toArray(ageMap),
  });
}
