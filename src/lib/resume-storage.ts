/**
 * Upload resume buffers to Supabase Storage (bucket: resumes).
 * Used by SEEK import, apply form, and manual CV upload.
 */
export function guessResumeMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export async function uploadResumeBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[resume-storage] Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel",
    );
    return null;
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Resume file exceeds 10 MB limit");
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const supabase = getSupabaseAdmin();
  const safeFilename = `seek-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storagePath = `resumes/${safeFilename}`;
  const contentType = mimeType || guessResumeMimeType(fileName);

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.warn("[resume-storage] Upload failed:", uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from("resumes").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadResumeBase64(
  resumeBase64: string,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  const buffer = Buffer.from(resumeBase64, "base64");
  if (buffer.length < 100) return null;
  return uploadResumeBuffer(buffer, fileName, mimeType);
}
