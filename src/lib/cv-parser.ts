/**
 * CV / Resume Parser
 *
 * Extracts raw text from PDF or DOCX files, then sends it to the configured
 * AI provider (OpenAI-compatible: Groq, Ollama, etc.) to extract structured
 * candidate data.
 */

export interface ParsedCVData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  yearsOfExperience: number | null;
  currentRole: string | null;
  skills: string[];
  summary: string | null;
}

/**
 * Extract plain text from a PDF buffer using pdf-parse.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);
  return result.text || "";
}

/**
 * Extract plain text from a DOCX buffer using mammoth.
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

/**
 * Extract text from a file buffer based on its MIME type / filename.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const isPdf =
    mimeType === "application/pdf" ||
    filename.toLowerCase().endsWith(".pdf");

  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.toLowerCase().endsWith(".docx");

  if (isPdf) {
    return extractPdfText(buffer);
  }

  if (isDocx) {
    return extractDocxText(buffer);
  }

  // Fallback: try PDF first, then DOCX
  try {
    return await extractPdfText(buffer);
  } catch {
    try {
      return await extractDocxText(buffer);
    } catch {
      return "";
    }
  }
}

/**
 * Send extracted CV text to the AI provider and return structured data.
 * Falls back to empty data if AI is unavailable or parsing fails.
 */
export async function parseCVWithAI(
  cvText: string,
): Promise<ParsedCVData | null> {
  if (!cvText.trim()) return null;

  const aiUrl =
    process.env.AI_API_URL ||
    "http://127.0.0.1:11434/v1/chat/completions";
  const aiKey = process.env.AI_API_KEY || "";
  const aiModel = process.env.AI_MODEL || "qwen2.5";

  const systemPrompt = `You are an expert HR assistant. Extract structured information from the provided resume/CV text. Return ONLY a valid JSON object with these exact fields:
{
  "fullName": string or null,
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "yearsOfExperience": number or null,
  "currentRole": string or null,
  "skills": string[],
  "summary": string or null
}
If a field cannot be found, return null for that field. For skills, return an empty array if none found.`;

  const userPrompt = `Extract candidate information from this CV/resume:\n\n${cvText.slice(0, 8000)}`;

  try {
    const response = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(aiKey ? { Authorization: `Bearer ${aiKey}` } : {}),
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.warn(`CV AI parsing failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content || data.response || "{}";

    const parsed = JSON.parse(content) as ParsedCVData;

    // Normalise skills to always be an array
    if (!Array.isArray(parsed.skills)) {
      parsed.skills = [];
    }

    return parsed;
  } catch (err) {
    console.warn("CV AI parsing error (non-fatal):", err);
    return null;
  }
}
