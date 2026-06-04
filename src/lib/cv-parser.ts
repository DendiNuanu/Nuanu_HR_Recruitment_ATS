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
  /** City / region / country where the candidate currently lives. */
  location: string | null;
  /** Separate from location — often the legal address. */
  domicile: string | null;
  /** Candidate's stated work arrangement: "On-site" | "Remote" | "Hybrid" | null. */
  workPreference: string | null;
  /** Whether the candidate is open to relocating for the job. */
  willingToRelocate: boolean | null;
  /** Monthly expected salary in the candidate's stated currency, as a number. */
  expectedSalary: number | null;
  /** Currency code (e.g. "IDR", "USD") or null. */
  expectedSalaryCurrency: string | null;
  yearsOfExperience: number | null;
  currentRole: string | null;
  gender: string | null;
  nationality: string | null;
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
  domicile: null,
  workPreference: null,
  willingToRelocate: null,
  expectedSalary: null,
  expectedSalaryCurrency: null,
  yearsOfExperience: null,
  currentRole: null,
  gender: null,
  nationality: null,
  skills: [],
  summary: null,
};

// ── JSON helpers ────────────────────────────────────────────────────────────

/** Map the AI's free-form work-preference string to one of three canonical values. */
function normalizeWorkPreference(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (/(on[- ]?site|onsite|wfo|in[- ]?office|office[- ]?based)/i.test(v))
    return "On-site";
  if (/(remote|wfh|work from home)/i.test(v)) return "Remote";
  if (/(hybrid|flexible|mixed)/i.test(v)) return "Hybrid";
  return null;
}

/** Coerce a wide range of truthy/falsy strings to a strict boolean. */
function normalizeBoolean(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "1", "open", "willing", "able"].includes(v))
    return true;
  if (["no", "n", "false", "0", "not willing", "unable"].includes(v))
    return false;
  return null;
}

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
      fullName:
        typeof p.fullName === "string" && p.fullName ? p.fullName : null,
      email: typeof p.email === "string" && p.email ? p.email : null,
      phone: typeof p.phone === "string" && p.phone ? p.phone : null,
      location:
        typeof p.location === "string" && p.location ? p.location : null,
      domicile:
        typeof p.domicile === "string" && p.domicile ? p.domicile : null,
      workPreference: normalizeWorkPreference(p.workPreference),
      willingToRelocate: normalizeBoolean(p.willingToRelocate),
      expectedSalary:
        typeof p.expectedSalary === "number"
          ? p.expectedSalary
          : typeof p.expectedSalary === "string" && p.expectedSalary
            ? Number(p.expectedSalary.replace(/[^0-9.]/g, "")) || null
            : null,
      expectedSalaryCurrency:
        typeof p.expectedSalaryCurrency === "string" && p.expectedSalaryCurrency
          ? p.expectedSalaryCurrency.toUpperCase()
          : null,
      yearsOfExperience:
        typeof p.yearsOfExperience === "number"
          ? p.yearsOfExperience
          : typeof p.yearsOfExperience === "string" && p.yearsOfExperience
            ? parseInt(p.yearsOfExperience, 10) || null
            : null,
      currentRole:
        typeof p.currentRole === "string" && p.currentRole
          ? p.currentRole
          : null,
      gender: typeof p.gender === "string" && p.gender ? p.gender : null,
      nationality:
        typeof p.nationality === "string" && p.nationality
          ? p.nationality
          : null,
      skills: Array.isArray(p.skills)
        ? (p.skills as string[]).filter(Boolean)
        : [],
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
  } catch {
    /* fall through */
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch {
    /* fall through */
  }

  return "";
}

// ── Prompt builders ────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are an expert HR assistant that extracts structured information from resumes. " +
  "Always respond with a single raw JSON object — no markdown, no code fences, no commentary. " +
  "Use null for any field you cannot find in the resume. Never invent values. " +
  "Be precise: a 'location' is a city/region/country, not a job title or work arrangement.";

function buildUserPrompt(cvText: string): string {
  return (
    `Extract candidate information from the CV below. Return ONLY a JSON object with these exact keys:\n\n` +
    `{\n` +
    `  "fullName": "candidate's full name as written on the CV, or null",\n` +
    `  "email": "primary email address, or null",\n` +
    `  "phone": "primary phone number with country code if present, or null",\n` +
    `  "location": "city, region, and country where the candidate currently lives — e.g. 'Prabumulih, South Sumatra, Indonesia'. NOT a work arrangement. null if not found.",\n` +
    `  "domicile": "the candidate's official/legal address if stated separately from current location, otherwise null",\n` +
    `  "workPreference": "ONE of: 'On-site', 'Remote', 'Hybrid'. Look for phrases like 'willing to work on-site', 'open to remote', 'hybrid preferred'. null if not stated.",\n` +
    `  "willingToRelocate": true or false — only true if the candidate explicitly states willingness to relocate, false if explicitly unwilling, null if unstated.\n` +
    `  "expectedSalary": numeric monthly expected salary as a number (no currency symbol, no commas), or null. Example: 10000000.\n` +
    `  "expectedSalaryCurrency": "3-letter currency code if salary is mentioned, e.g. 'IDR' or 'USD'. null otherwise."\n` +
    `  "yearsOfExperience": total years of relevant professional experience as an integer, or null\n` +
    `  "currentRole": "candidate's most recent job title (the position, not the company), or null",\n` +
    `  "gender": "male, female, or other — only if explicitly stated, otherwise null",\n` +
    `  "nationality": "candidate's nationality if stated, otherwise null",\n` +
    `  "skills": ["array", "of", "distinct", "skill", "strings"]\n` +
    `  "summary": "1-2 sentence professional summary of the candidate, or null"\n` +
    `}\n\n` +
    `CRITICAL RULES:\n` +
    `- "location" MUST be a geographic place. Never put "On-site", "Remote", or "Hybrid" there.\n` +
    `- "workPreference" is a separate field. Don't confuse it with location.\n` +
    `- If a value is not in the CV, return null for that field. Do NOT guess.\n` +
    `- Output ONLY the JSON object, no other text.\n\n` +
    `CV TEXT:\n---\n${cvText.slice(0, 5000)}\n---\n\n` +
    `JSON:`
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
        // Force valid JSON output — eliminates markdown-fence wrapping and
        // dramatically reduces parse failures.
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `[CV Parser] Groq HTTP ${response.status}: ${errText.slice(0, 300)}`,
      );
      return null;
    }

    const responseData = await response.json();
    const raw: string = responseData.choices?.[0]?.message?.content ?? "";

    console.log(
      "[CV Parser] Groq raw response (first 300 chars):",
      raw.slice(0, 300),
    );

    const result = safeParseJSON(raw);
    if (result && (result.fullName || result.email || result.currentRole)) {
      console.log(
        `[CV Parser] ✅ Groq succeeded — name: ${result.fullName}, email: ${result.email}`,
      );
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
    console.log(
      `[CV Parser] Trying Ollama (${ollamaModel} at ${ollamaUrl})...`,
    );

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(cvText)}`,
        stream: false,
        format: "json",
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

    console.log(
      "[CV Parser] Ollama raw response (first 300 chars):",
      raw.slice(0, 300),
    );

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

/**
 * Best-effort location recovery for when the AI didn't find one.
 *
 * Strategy:
 *   1. If SEEK provided a location, trust it.
 *   2. Otherwise, look at the CV header/contact section for an explicit label
 *      ("Location:", "Address:", "Domicile:", "Based in:") and parse that.
 *   3. Otherwise, find the first geographic location mention in the contact
 *      section (city, region, country, ZIP code pattern).
 *
 * IMPORTANT: This is a fallback only. It must NEVER overwrite a non-null value
 * from the AI — it runs only when the AI returned null for `location`.
 */
export function extractLocation(
  cvText: string,
  seekLocation?: string | null,
): string | null {
  if (seekLocation?.trim()) return seekLocation.trim();

  const head = cvText.slice(0, Math.min(cvText.length, 2800));
  // Stop scanning at the first "work experience" / "pengalaman kerja" header,
  // so we never pick up a job's location as the candidate's.
  const contactOnly =
    head.split(
      /\n\s*(experience|employment history|work experience|professional experience|pengalaman kerja|riwayat pekerjaan)\b/i,
    )[0] || head;

  const labeled = contactOnly.match(
    /(?:location|address|domicile|residence|based in|lokasi|alamat)\s*[:\-]\s*([^\n]{3,120})/i,
  );
  if (labeled?.[1]) {
    const loc = labeled[1].trim().replace(/\s+/g, " ");
    // Reject values that look like a work arrangement, not a place
    if (loc.length >= 3 && loc.length <= 120 && !isWorkArrangement(loc)) {
      return loc;
    }
  }

  // Look for a "City, Region" or "City, Country" pattern at the start of a line
  const cityLine = contactOnly.match(
    /^[ \t]*([A-Z][A-Za-z\u00C0-\u017F .'-]{2,40}?(?:,\s*[A-Z][A-Za-z\u00C0-\u017F .'-]{2,40}){0,3})[ \t]*$/m,
  );
  if (cityLine?.[1]) {
    const loc = cityLine[1].trim().replace(/\s+/g, " ");
    if (loc.length >= 3 && loc.length <= 120 && !isWorkArrangement(loc)) {
      return loc;
    }
  }

  return null;
}

function isWorkArrangement(s: string): boolean {
  return /^(on[- ]?site|onsite|remote|wfh|hybrid|in[- ]?office|office[- ]?based|flexible)$/i.test(
    s.trim(),
  );
}

function withResolvedLocation(
  data: ParsedCVData,
  cvText: string,
  seekLocation?: string | null,
): ParsedCVData {
  // Only use the fallback when the AI didn't find a location — never overwrite
  // a real value. This was the root cause of "Marindah shows 'On site' instead
  // of Prabumulih": the fallback ran unconditionally and clobbered the AI.
  if (data.location?.trim()) {
    return { ...data, domicile: data.domicile ?? data.location };
  }
  const fallback = extractLocation(cvText, seekLocation);
  return { ...data, location: fallback, domicile: data.domicile ?? fallback };
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
    const aiWorked = !!(
      groqResult.fullName ||
      groqResult.email ||
      groqResult.currentRole
    );
    return {
      data: withResolvedLocation(groqResult, cvText, seekLocation),
      engine: "groq",
      aiWorked,
    };
  }

  // 2. Try Ollama (fallback — works locally only)
  const ollamaResult = await parseWithOllama(cvText);
  if (ollamaResult) {
    const aiWorked = !!(
      ollamaResult.fullName ||
      ollamaResult.email ||
      ollamaResult.currentRole
    );
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
