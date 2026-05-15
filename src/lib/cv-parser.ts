/**
 * CV / Resume Parser
 *
 * Text extraction: pdf-parse (PDF) + mammoth (DOCX)
 * AI parsing:
 *   1st — Groq API  (AI_API_URL / AI_API_KEY / AI_MODEL — already configured)
 *   2nd — Ollama    (OLLAMA_URL / AI_MODEL — local fallback)
 *   3rd — empty     (user fills manually)
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

export type ParseEngine = "groq" | "ollama" | "none";

export interface ParseResult {
  data: ParsedCVData;
  engine: ParseEngine;
  aiWorked: boolean;
}

const EMPTY_DATA: ParsedCVData = {
  fullName: null,
  email: null,
  phone: null,
  location: null,
  yearsOfExperience: null,
  currentRole: null,
  skills: [],
  summary: null,
};

const SYSTEM_PROMPT =
  "You are an expert HR assistant that extracts structured data from resumes. " +
  "Your response must be ONLY a valid JSON object — no explanation, no markdown, no code fences. " +
  "If a field is not found, use null. For skills return an array of strings. " +
  "For yearsOfExperience return a number.";

function buildUserPrompt(cvText: string): string {
  return (
    `Extract candidate information from this CV and return a JSON object with exactly these fields:\n` +
    `{\n` +
    `  "fullName": string or null,\n` +
    `  "email": string or null,\n` +
    `  "phone": string or null,\n` +
    `  "location": string or null,\n` +
    `  "yearsOfExperience": number or null,\n` +
    `  "currentRole": string or null,\n` +
    `  "skills": array of strings,\n` +
    `  "summary": string or null\n` +
    `}\n\n` +
    `CV TEXT:\n---\n${cvText.slice(0, 6000)}\n---\n\nReturn only the JSON object:`
  );
}

/** Strip markdown fences and extract the first JSON object from a string. */
function safeParseJSON(raw: string): ParsedCVData | null {
  try {
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const p = JSON.parse(match[0]);

    return {
      fullName: typeof p.fullName === "string" ? p.fullName : null,
      email: typeof p.email === "string" ? p.email : null,
      phone: typeof p.phone === "string" ? p.phone : null,
      location: typeof p.location === "string" ? p.location : null,
      yearsOfExperience:
        typeof p.yearsOfExperience === "number" ? p.yearsOfExperience : null,
      currentRole: typeof p.currentRole === "string" ? p.currentRole : null,
      skills: Array.isArray(p.skills) ? (p.skills as string[]) : [],
      summary: typeof p.summary === "string" ? p.summary : null,
    };
  } catch {
    return null;
  }
}

// ── Text extraction ────────────────────────────────────────────────────────

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const name = filename.toLowerCase();
  const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");

  if (isPdf) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text || "";
  }

  if (isDocx) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // Unknown type — try PDF first, then DOCX
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    if (result.text) return result.text;
  } catch { /* fall through */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch { /* fall through */ }

  return "";
}

// ── PRIMARY: Groq via existing AI_API_URL config ───────────────────────────

async function parseWithGroq(cvText: string): Promise<ParsedCVData | null> {
  const aiUrl =
    process.env.AI_API_URL ||
    "https://api.groq.com/openai/v1/chat/completions";
  const aiKey = process.env.AI_API_KEY || "";
  const aiModel = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  // Only attempt if we have a key (Groq requires one)
  if (!aiKey) {
    console.warn("[CV Parser] No AI_API_KEY — skipping Groq");
    return null;
  }

  try {
    console.log("[CV Parser] Trying Groq API...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(cvText) },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        stream: false,
        // response_format omitted — not all Groq models support it; we parse manually
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[CV Parser] Groq HTTP ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";

    const result = safeParseJSON(raw);
    if (result) {
      console.log("[CV Parser] Groq succeeded ✅");
      return result;
    }

    console.warn("[CV Parser] Groq returned unparseable response:", raw.slice(0, 200));
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[CV Parser] Groq error:", msg);
    return null;
  }
}

// ── FALLBACK: Ollama local ─────────────────────────────────────────────────

async function parseWithOllama(cvText: string): Promise<ParsedCVData | null> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.AI_MODEL ?? "qwen2.5:latest";

  try {
    console.log("[CV Parser] Falling back to Ollama...");

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(cvText)}`,
        stream: false,
        options: { temperature: 0.1, num_predict: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      console.warn("[CV Parser] Ollama HTTP error:", response.status);
      return null;
    }

    const data = await response.json();
    const raw: string = data.response ?? "";

    const result = safeParseJSON(raw);
    if (result) {
      console.log("[CV Parser] Ollama succeeded ✅");
      return result;
    }

    console.warn("[CV Parser] Ollama returned unparseable response");
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[CV Parser] Ollama error:", msg);
    return null;
  }
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────

export async function parseCVWithAI(cvText: string): Promise<ParseResult> {
  if (!cvText.trim()) {
    return { data: EMPTY_DATA, engine: "none", aiWorked: false };
  }

  // 1. Try Groq
  const groqResult = await parseWithGroq(cvText);
  if (groqResult) {
    const aiWorked = !!(
      groqResult.fullName ||
      groqResult.email ||
      groqResult.currentRole
    );
    return { data: groqResult, engine: "groq", aiWorked };
  }

  // 2. Try Ollama
  const ollamaResult = await parseWithOllama(cvText);
  if (ollamaResult) {
    const aiWorked = !!(
      ollamaResult.fullName ||
      ollamaResult.email ||
      ollamaResult.currentRole
    );
    return { data: ollamaResult, engine: "ollama", aiWorked };
  }

  // 3. Both failed
  console.error("[CV Parser] Both Groq and Ollama failed — returning empty");
  return { data: EMPTY_DATA, engine: "none", aiWorked: false };
}
