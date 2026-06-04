#!/usr/bin/env python3
"""Patch /home/dendy/seek-scraper/seek-extract.js to extract expected salary."""

import sys
from pathlib import Path

target = Path("/home/dendy/seek-scraper/seek-extract.js")
src = target.read_text()

OLD = """  if (!domicileLocation) {
    const locEl = [...root.querySelectorAll("span, p, div, li")].find((el) => {
      if (el.children.length > 2) return false;
      const t = (el.textContent || "").trim();
      return isSeekDomicileLine(t);
    });
    if (locEl) domicileLocation = normalizeDomicile(locEl.textContent);
  }

  return { name, email, phone, profileUrl, location: domicileLocation };
}"""

NEW = """  if (!domicileLocation) {
    const locEl = [...root.querySelectorAll("span, p, div, li")].find((el) => {
      if (el.children.length > 2) return false;
      const t = (el.textContent || "").trim();
      return isSeekDomicileLine(t);
    });
    if (locEl) domicileLocation = normalizeDomicile(locEl.textContent);
  }

  // Application questions / Screening questions: SEEK shows candidate answers
  // here. The most important one for ATS analytics is "Expected monthly salary".
  const { expectedSalaryRaw, expectedSalary, expectedSalaryCurrency } =
    extractExpectedSalaryFromModal(root);

  return {
    name,
    email,
    phone,
    profileUrl,
    location: domicileLocation,
    expectedSalaryRaw,
    expectedSalary,
    expectedSalaryCurrency,
  };
}

// --- Salary extraction -------------------------------------------------
//
// SEEK shows screening/application questions as a label/value pair. We scan
// every element in the modal for a label that matches "expected monthly
// salary" (or variants), then parse the value. Examples seen in the wild:
//
//   "Rp 15 million"             -> 15000000  IDR
//   "Rp 15.000.000"             -> 15000000  IDR
//   "IDR 15,000,000"            -> 15000000  IDR
//   "Rp 15 jt"                  -> 15000000  IDR
//   "USD 2,000"                 -> 2000      USD
//   "SGD 3.5k"                  -> 3500      SGD
//   "Rp 10-15 juta"             -> null      (range -- we return null rather than guess)
//
// The raw text is always preserved so the ATS can display exactly what the
// candidate typed, even when the parser couldn't normalize it.

const SALARY_LABEL_PATTERNS = [
  /expected\\s+monthly\\s+salary/i,
  /expected\\s+salary/i,
  /monthly\\s+salary\\s+expectation/i,
  /gaji\\s+yang\\s+diharapkan/i,
  /ekspektasi\\s+gaji/i,
  /salary\\s+expectation/i,
];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}

function isSalaryLabel(text) {
  const t = (text || "").trim();
  if (!t || t.length > 80) return false;
  return SALARY_LABEL_PATTERNS.some((re) => re.test(t));
}

const UNIT_MULTIPLIERS = {
  thousand: 1_000,
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  million: 1_000_000,
  m: 1_000_000,
  jt: 1_000_000,
  juta: 1_000_000,
  billion: 1_000_000_000,
  b: 1_000_000_000,
  miliar: 1_000_000_000,
  milyar: 1_000_000_000,
};

const CURRENCY_TOKENS = [
  "IDR",
  "USD",
  "SGD",
  "MYR",
  "AUD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "HKD",
  "PHP",
  "THB",
  "VND",
];

/**
 * Try to extract the candidate's expected monthly salary from the modal DOM.
 *
 * Returns:
 *   { expectedSalaryRaw, expectedSalary, expectedSalaryCurrency }
 *
 * Where:
 *   - expectedSalaryRaw     = the original text exactly as displayed on SEEK (or null)
 *   - expectedSalary        = numeric monthly amount (or null if unparseable)
 *   - expectedSalaryCurrency = ISO 3-letter code; defaults to "IDR" when a value
 *                              is detected without an explicit currency (SEEK is
 *                              id.employer.seek.com so IDR is the safe default).
 */
function extractExpectedSalaryFromModal(root) {
  try {
    const result = {
      expectedSalaryRaw: null,
      expectedSalary: null,
      expectedSalaryCurrency: null,
    };

    // 1) Look for explicit label/value rows. SEEK uses a definition list or
    //    adjacent divs: <div>Expected monthly salary</div><div>Rp 15 million</div>
    const candidates = [
      ...root.querySelectorAll("dt, dd, div, span, li, p, label"),
    ].filter((el) => el.children.length <= 3);

    for (const el of candidates) {
      const labelText = (el.textContent || "").trim();
      if (!isSalaryLabel(labelText)) continue;
      if (labelText.length > 80) continue; // too long to be just a label

      const valueNode = findSalaryValueNear(el, root);
      if (valueNode) {
        const raw = (valueNode.textContent || "").trim();
        if (raw && raw.length <= 80 && !isSalaryLabel(raw)) {
          result.expectedSalaryRaw = raw;
          break;
        }
      }
    }

    // 2) Fallback: scan the modal text for any line that looks like a salary
    //    string, IF we already have a salary-related label nearby.
    if (!result.expectedSalaryRaw) {
      const allText = (root.innerText || "")
        .split("\\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const labelIdx = allText.findIndex((l) => isSalaryLabel(l));
      if (labelIdx >= 0) {
        for (
          let i = labelIdx + 1;
          i < Math.min(labelIdx + 5, allText.length);
          i++
        ) {
          const candidate = allText[i];
          if (!candidate || isSalaryLabel(candidate)) continue;
          if (candidate.length > 80) continue;
          result.expectedSalaryRaw = candidate;
          break;
        }
      }
    }

    if (!result.expectedSalaryRaw) {
      return result;
    }

    // 3) Normalize the raw string into a numeric amount + currency.
    const parsed = parseSalaryString(result.expectedSalaryRaw);
    if (parsed.amount != null) {
      result.expectedSalary = parsed.amount;
      result.expectedSalaryCurrency = parsed.currency || "IDR";
    } else {
      // No number was found in the raw text. Keep the raw text (HR can see
      // what the candidate typed) but don't claim a default currency.
      result.expectedSalary = null;
      result.expectedSalaryCurrency = null;
    }

    return result;
  } catch (err) {
    console.warn(
      "[seek-extract] salary extraction failed:",
      err && err.message ? err.message : err,
    );
    return {
      expectedSalaryRaw: null,
      expectedSalary: null,
      expectedSalaryCurrency: null,
    };
  }
}

function findSalaryValueNear(labelEl, root) {
  let n = labelEl.nextElementSibling;
  for (let i = 0; i < 3 && n; i++, n = n.nextElementSibling) {
    const t = (n.textContent || "").trim();
    if (t && t.length <= 80 && !isSalaryLabel(t)) return n;
  }
  const parent = labelEl.parentElement;
  if (parent) {
    const p = parent.nextElementSibling;
    if (p) {
      const t = (p.textContent || "").trim();
      if (t && t.length <= 80 && !isSalaryLabel(t)) return p;
    }
    const parentSibling = parent.nextElementSibling;
    if (parentSibling) {
      const inner = parentSibling.querySelector(
        "dd, .value, [data-automation*='value']",
      );
      if (inner) {
        const t = (inner.textContent || "").trim();
        if (t && t.length <= 80 && !isSalaryLabel(t)) return inner;
      }
    }
  }
  return null;
}

/**
 * Parse a salary string like "Rp 15 million" or "IDR 15,000,000" into a
 * numeric amount and currency code.
 */
function parseSalaryString(raw) {
  if (!raw) return { amount: null, currency: null };

  const text = raw.trim();
  const result = { amount: null, currency: null };

  // 1) Detect currency
  const upper = text.toUpperCase();
  for (const c of CURRENCY_TOKENS) {
    if (upper.includes(c)) {
      result.currency = c;
      break;
    }
  }
  // Common symbols
  if (!result.currency) {
    if (text.includes("Rp") || text.includes("rp")) result.currency = "IDR";
    else if (text.includes("$")) result.currency = "USD";
    else if (text.includes("S$")) result.currency = "SGD";
  }
  // Per spec: if no currency is detected at all, default to IDR (the SEEK
  // instance is id.employer.seek.com so this is the safe default). However,
  // if no number is found we still return currency=null so the caller can
  // distinguish "no salary info" from "IDR with a value".
  if (!result.currency) {
    result.currency = "IDR";
  }

  if (/\\d+\\s*[-–—]\\s*\\d+/.test(text)) {
    const numbers = text.match(/-?\\d[\\d.,]*/g) || [];
    if (numbers.length >= 2) {
      return { amount: null, currency: result.currency };
    }
  }

  let body = text
    .replace(/IDR|USD|SGD|MYR|AUD|EUR|GBP|JPY|CNY|HKD|PHP|THB|VND/gi, "")
    .replace(/Rp|rp/gi, "")
    .replace(/[$\\u00A3\\u20AC\\u00A5]/g, "")
    .trim();

  // Multiplier word (million, juta, etc.) -> multiplier.
  // Pick the LONGEST matching key so "milyar" beats "m", "million" beats
  // "m", "juta" beats "jt", etc. Use lookarounds so the multiplier can
  // attach to a digit (e.g. "3.5k") where there's no word boundary.
  let multiplier = 1;
  const lower = body.toLowerCase();
  const keys = Object.keys(UNIT_MULTIPLIERS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const re = new RegExp(
      `(?<![\\w])${escapeRegex(key)}(?![\\w])`,
      "i",
    );
    if (re.test(lower)) {
      multiplier = UNIT_MULTIPLIERS[key];
      break;
    }
  }

  // Find the first number in the body
  const numMatch = body.match(/-?\\d[\\d.,]*/);
  if (!numMatch) return { amount: null, currency: result.currency };

  let numStr = numMatch[0];

  // Normalize thousands / decimal separators. Rules:
  //   - If BOTH comma and dot present, the rightmost separator is the decimal.
  //     e.g. "1,234.56" -> 1234.56
  //   - If only one type:
  //     - "15,000,000" (multiple commas, each group 3 digits) -> 15000000
  //     - "15,000"     (one comma, 3 trailing digits)         -> 15000
  //     - "1.000.000"  (multiple dots, each group 3 digits)    -> 1000000
  //     - "1.2"        (one dot, NOT 3 trailing digits)        -> 1.2
  //     - "1.200"      (one dot, 3 trailing digits)           -> 1200
  const dots = (numStr.match(/\\./g) || []).length;
  const commas = (numStr.match(/,/g) || []).length;
  if (dots > 0 && commas > 0) {
    // rightmost is decimal; the others are thousands
    if (numStr.lastIndexOf(".") > numStr.lastIndexOf(",")) {
      // e.g. 1,234.56
      numStr = numStr.replace(/,/g, "");
    } else {
      // e.g. 1.234,56
      numStr = numStr.replace(/\\./g, "").replace(",", ".");
    }
  } else if (commas > 1) {
    // "15,000,000" -> all commas are thousands
    numStr = numStr.replace(/,/g, "");
  } else if (commas === 1) {
    // "15,000" vs "15,5" — decide by trailing group length
    const parts = numStr.split(",");
    if (parts.length === 2 && parts[1].length === 3) {
      numStr = parts.join("");
    } else {
      numStr = numStr.replace(",", ".");
    }
  } else if (dots > 1) {
    // "1.000.000" -> all dots are thousands
    numStr = numStr.replace(/\\./g, "");
  } else if (dots === 1) {
    // "1.2" stays as 1.2; "1.200" is ambiguous but most likely thousands
    const parts = numStr.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      numStr = parts.join("");
    }
    // else: leave as is (decimal like 1.2)
  }

  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return { amount: null, currency: result.currency };

  result.amount = Math.round(n * multiplier);
  return result;
}"""

if OLD not in src:
    print("ERROR: anchor not found", file=sys.stderr)
    sys.exit(1)

count = src.count(OLD)
if count != 1:
    print(f"ERROR: anchor found {count} times, expected 1", file=sys.stderr)
    sys.exit(1)

new_src = src.replace(OLD, NEW)
target.write_text(new_src)
print(f"OK: patched {target} ({len(src)} -> {len(new_src)} bytes)")
