import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await params;
  const formData = await request.formData();

  const { uploadCandidateResume } = await import(
    "@/app/dashboard/candidates/actions"
  );
  const result = await uploadCandidateResume(applicationId, formData);

  if (result.success) return NextResponse.json(result, { status: 200 });
  return NextResponse.json({ error: result.error }, { status: 400 });
}
