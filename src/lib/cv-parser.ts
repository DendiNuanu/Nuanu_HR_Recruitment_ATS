/**
 * CV / Resume Parser
 *
 * Text extraction: pdf-parse (PDF) + mammoth (DOCX)
 * AI parsing:
 *   1st — Groq API  (AI_API_KEY already in .env — uses llama-3.3-70b-versatile
 *                    which reliably returns JSON; falls back to AI_MODEL if set)
 *   2nd — Ollama    (http://localhost:11434 — local fallback, skipped on Vercel)
 *   3rd — empty     (user fills manually)
 *
 * NOTE: We use AI_API_KEY (not GROQ_API_KEY) — that is the key name in .env.
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

// ── JSON helpers ───────────────────────────────────────────────────────────

/** Strip markdown fences and extract the first JSON object from a string. */
function safeParseJSON(raw: string): ParsedCVData | null {
  try {
    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[CV Parser] No JSON object found in response");
      return null;
    }

    const p = JSON.parse(match[0]);

    return {
      fullName: typeof p.fullName === "string" && p.fullName ? p.fullName : null,
      email: typeof p.email === "string" && p.email ? p.email : null,
      phone: typeof p.phone === "string" && p.phone ? p.phone : null,
      location: typeof p.location === "string" && p.location ? p.location : null,
      yearsOfExperience:
        typeof p.yearsOfExperience === "number"
          ? p.yearsOfExperience
          : typeof p.yearsOfExperience === "string" && p.yearsOfExperience
          ? parseInt(p.yearsOfExperience, 10) || null
          : null,
      currentRole:
        typeof p.currentRole === "string" && p.currentRole ? p.currentRole : null,
      skills: Array.isArray(p.skills) ? (p.skills as string[]).filter(Boolean) : [],
      summary: typeof p.summary === "string" && p.summary ? p.summary : null,
    };
  } catch (err) {
    console.error("[CV Parser] JSON parse error:", err);
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

// ── Prompt builders ────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are an expert HR assistant. Extract structured data from the resume text provided. " +
  "Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation. " +
  "Use null for any field not found. Skills must be an array of strings.";

function buildUserPrompt(cvText: string): string {
  return (
    `Extract candidate information from this CV. Return ONLY a JSON object with these exact fields:\n\n` +
    `{\n` +
    `  "fullName": "string or null",\n` +
    `  "email": "string or null",\n` +
    `  "phone": "string or null",\n` +
    `  "location": "city and country, or null",\n` +
    `  "yearsOfExperience": number or null,\n` +
    `  "currentRole": "most recent job title, or null",\n` +
    `  "skills": ["array", "of", "skill", "strings"],\n` +
    `  "summary": "1-2 sentence summary of the candidate, or null"\n` +
    `}\n\n` +
    `CV TEXT:\n---\n${cvText.slice(0, 5000)}\n---\n\n` +
    `Return only the JSON object, nothing else:`
  );
}

// ── PRIMARY: Groq via AI_API_KEY (already in .env) ────────────────────────

async function parseWithGroq(cvText: string): Promise<ParsedCVData | null> {
  const aiKey = process.env.AI_API_KEY || "";

  if (!aiKey) {
    console.warn("[CV Parser] AI_API_KEY not set — skipping Groq");
    return null;
  }

  // Always use Groq's endpoint for CV parsing (AI_API_URL may point elsewhere)
  const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

  // Use llama-3.3-70b-versatile for CV parsing — it reliably returns JSON.
  // qwen-2.5-32b (the AI_MODEL for scoring) sometimes wraps output in markdown.
  const cvModel = "llama-3.3-70b-versatile";

  try {
    console.log(`[CV Parser] Calling Groq (${cvModel})...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: cvModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(cvText) },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[CV Parser] Groq HTTP ${response.status}: ${errText.slice(0, 300)}`);
      return null;
    }

    const responseData = await response.json();
    const raw: string = responseData.choices?.[0]?.message?.content ?? "";

    console.log("[CV Parser] Groq raw response (first 300 chars):", raw.slice(0, 300));

    const result = safeParseJSON(raw);
    if (result && (result.fullName || result.email || result.currentRole)) {
      console.log(`[CV Parser] ✅ Groq succeeded — name: ${result.fullName}, email: ${result.email}`);
      return result;
    }

    console.warn("[CV Parser] Groq returned data but all fields are null");
    // Still return the result even if sparse — better than nothing
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CV Parser] Groq error:", msg);
    return null;
  }
}

// ── FALLBACK: Ollama local (only works when running locally) ───────────────

async function parseWithOllama(cvText: string): Promise<ParsedCVData | null> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.AI_MODEL ?? "qwen2.5:latest";

  try {
    console.log(`[CV Parser] Trying Ollama (${ollamaModel} at ${ollamaUrl})...`);

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

    console.log("[CV Parser] Ollama raw response (first 300 chars):", raw.slice(0, 300));

    const result = safeParseJSON(raw);
    if (result) {
      console.log(`[CV Parser] ✅ Ollama succeeded — name: ${result.fullName}`);
      return result;
    }

    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Connection refused is expected on Vercel — log as info not error
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      console.info("[CV Parser] Ollama not available (expected on Vercel)");
    } else {
      console.warn("[CV Parser] Ollama error:", msg);
    }
    return null;
  }
}

/** Prefer SEEK domicile; otherwise parse contact/header only — never work history */
export function extractLocation(
  cvText: string,
  seekLocation?: string | null,
): string | null {
  if (seekLocation?.trim()) return seekLocation.trim();

  const head = cvText.slice(0, Math.min(cvText.length, 2800));
  const contactOnly =
    head.split(
      /\n\s*(experience|employment history|work experience|professional experience|pengalaman kerja|riwayat pekerjaan)\b/i,
    )[0] || head;

  const labeled = contactOnly.match(
    /(?:location|address|domicile|residence|based in|lokasi|alamat)\s*[:\-]\s*([^\n]{3,80})/i,
  );
  if (labeled?.[1]) {
    const loc = labeled[1].trim().replace(/\s+/g, " ");
    if (loc.length >= 3 && loc.length <= 80) return loc;
  }

  const city = contactOnly.match(
    /\b((?:Kabupaten|Kota)\s+)?(Bali|Jakarta|Surabaya|Bandung|Yogyakarta|Semarang|Medan|Denpasar|Makassar)(?:\s*,\s*Indonesia)?/i,
  );
  if (city?.[0]) {
    const loc = city[0].trim().replace(/\s+/g, " ");
    if (loc.length >= 3 && loc.length <= 80) return loc;
  }

  return null;
}

function withResolvedLocation(
  data: ParsedCVData,
  cvText: string,
  seekLocation?: string | null,
): ParsedCVData {
  return { ...data, location: extractLocation(cvText, seekLocation) };
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────

export async function parseCVWithAI(
  cvText: string,
  seekLocation?: string | null,
): Promise<ParseResult> {
  if (!cvText.trim()) {
    return { data: EMPTY_DATA, engine: "none", aiWorked: false };
  }

  // 1. Try Groq (primary — works on Vercel)
  const groqResult = await parseWithGroq(cvText);
  if (groqResult) {
    const aiWorked = !!(groqResult.fullName || groqResult.email || groqResult.currentRole);
    return {
      data: withResolvedLocation(groqResult, cvText, seekLocation),
      engine: "groq",
      aiWorked,
    };
  }

  // 2. Try Ollama (fallback — works locally only)
  const ollamaResult = await parseWithOllama(cvText);
  if (ollamaResult) {
    const aiWorked = !!(ollamaResult.fullName || ollamaResult.email || ollamaResult.currentRole);
    return {
      data: withResolvedLocation(ollamaResult, cvText, seekLocation),
      engine: "ollama",
      aiWorked,
    };
  }

  // 3. Both failed
  console.error("[CV Parser] ❌ Both Groq and Ollama failed");
  return { data: EMPTY_DATA, engine: "none", aiWorked: false };
}
