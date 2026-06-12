import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "resumes");

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

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
  try {
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error("Resume file exceeds 10 MB limit");
    }
    await ensureUploadsDir();
    const safeFilename = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    await fs.writeFile(filePath, buffer);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${appUrl}/uploads/resumes/${safeFilename}`;
  } catch (err: any) {
    console.warn("[resume-storage] Local upload failed:", err.message);
    return null;
  }
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
