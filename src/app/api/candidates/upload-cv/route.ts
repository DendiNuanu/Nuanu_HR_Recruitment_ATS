/**
 * POST /api/candidates/upload-cv
 *
 * 1. Validates file (PDF / DOCX, ≤ 10 MB)
 * 2. Tries to upload to Supabase Storage — GRACEFULLY SKIPPED if key missing
 * 3. Extracts text (pdf-parse / mammoth)
 * 4. Parses with AI — Groq first, Ollama fallback
 * 5. Returns { cvUrl, data, aiWorked, engine }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractTextFromFile, parseCVWithAI } from "@/lib/cv-parser";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse form data ────────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("cv") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // ── Validate file type ─────────────────────────────────────────────────────
  const filename = file.name.toLowerCase();
  const isPdf =
    file.type === "application/pdf" || filename.endsWith(".pdf");
  const isDocx =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported" },
      { status: 400 },
    );
  }

  // ── Validate file size ─────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size must be under 10MB" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ── Upload to Supabase Storage (fully optional — never crashes the route) ──
  let cvUrl = "";
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const { getSupabaseAdmin } = await import("@/lib/supabase");
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
        console.log("[upload-cv] Supabase upload OK:", cvUrl);
      } else {
        console.warn("[upload-cv] Supabase upload failed:", uploadError.message);
      }
    } else {
      console.info("[upload-cv] Supabase not configured — skipping file storage");
    }
  } catch (err) {
    // Never let storage failure crash the route
    console.warn("[upload-cv] Supabase error (non-fatal):", err);
  }

  // ── Extract text ───────────────────────────────────────────────────────────
  let cvText = "";
  try {
    cvText = await extractTextFromFile(buffer, file.name, file.type);
    console.log(`[upload-cv] Extracted ${cvText.length} chars from ${file.name}`);
  } catch (err) {
    console.warn("[upload-cv] Text extraction failed:", err);
  }

  if (!cvText || cvText.trim().length < 30) {
    // Return success with empty data — user can fill manually
    console.warn("[upload-cv] Text too short or empty — skipping AI");
    return NextResponse.json({
      success: true,
      cvUrl,
      data: null,
      aiWorked: false,
      engine: "none",
      warning: "Could not extract readable text from this file.",
    });
  }

  // ── AI Parsing — Groq first, Ollama fallback ───────────────────────────────
  const { data, engine, aiWorked } = await parseCVWithAI(cvText);

  console.log(`[upload-cv] AI result: engine=${engine} aiWorked=${aiWorked} name=${data.fullName} email=${data.email}`);

  return NextResponse.json({
    success: true,
    cvUrl,
    data,
    aiWorked,
    engine,
  });
}
