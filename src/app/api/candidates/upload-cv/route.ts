/**
 * POST /api/candidates/upload-cv
 *
 * Accepts a multipart/form-data request with a `cv` file field.
 * 1. Validates file type (PDF / DOCX) and size (≤ 10 MB).
 * 2. Uploads the file to Supabase Storage (resumes bucket).
 * 3. Extracts text from the file.
 * 4. Sends text to the AI provider to extract structured candidate data.
 * 5. Returns { cvUrl, parsedData }.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractTextFromFile, parseCVWithAI } from "@/lib/cv-parser";
import { getSupabaseAdmin } from "@/lib/supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export async function POST(request: Request) {
  // Auth guard
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = formData.get("cv") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const filename = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    filename.endsWith(ext),
  );
  const hasAllowedMime = ALLOWED_MIME_TYPES.includes(file.type);

  if (!hasAllowedExt && !hasAllowedMime) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported" },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be under 10MB" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  let cvUrl = "";
  try {
    const supabase = getSupabaseAdmin();
    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storagePath = `resumes/${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (!uploadError) {
      const { data } = supabase.storage
        .from("resumes")
        .getPublicUrl(storagePath);
      cvUrl = data.publicUrl;
    } else {
      console.warn("Supabase upload failed (non-fatal):", uploadError.message);
    }
  } catch (err) {
    console.warn("Supabase unavailable (non-fatal):", err);
  }

  // ── Extract text ───────────────────────────────────────────────────────────
  let cvText = "";
  try {
    cvText = await extractTextFromFile(buffer, file.name, file.type);
  } catch (err) {
    console.warn("Text extraction failed (non-fatal):", err);
  }

  // ── AI Parsing ─────────────────────────────────────────────────────────────
  let parsedData = null;
  if (cvText) {
    parsedData = await parseCVWithAI(cvText);
  }

  return NextResponse.json(
    { cvUrl, parsedData, cvText: cvText.slice(0, 500) },
    { status: 200 },
  );
}
