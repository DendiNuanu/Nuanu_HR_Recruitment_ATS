import { readFileSync } from "node:fs";
const src = readFileSync("/home/dendy/seek-scraper/seek-extract.js", "utf8");
const start = src.indexOf("// --- Salary extraction");
const end = src.indexOf("/**\n * Click a Past-applicants row", start);
const helpers = src.slice(start, end);

const helpersModule = { exports: {} };
new Function(
  "exports",
  "module",
  helpers + "\nmodule.exports = { parseSalaryString, UNIT_MULTIPLIERS };",
)(helpersModule.exports, helpersModule);

console.log("UNIT_MULTIPLIERS:", helpersModule.exports.UNIT_MULTIPLIERS);
console.log(
  "Rp 1.2 milyar ->",
  JSON.stringify(helpersModule.exports.parseSalaryString("Rp 1.2 milyar")),
);
console.log("Rp 1.2 milyar lower body:");
// manually trace
let body = "1.2 milyar";
const lower = body.toLowerCase();
for (const [key, mul] of Object.entries(
  helpersModule.exports.UNIT_MULTIPLIERS,
)) {
  const re = new RegExp(
    `(?<![\\w])${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}(?![\\w])`,
    "i",
  );
  const matches = lower.match(re);
  if (matches) {
    console.log(
      `  matched: "${key}" -> multiplier ${mul}, match: ${JSON.stringify(matches[0])}`,
    );
  }
}

// Wrapper that logs the actual function's behavior
const wrapped = `
global.document = { querySelector: () => null, querySelectorAll: () => [] };
${helpers}

// Hijack parseSalaryString to log the multiplier
const _orig = parseSalaryString;
global.parseSalaryString = function(raw) {
  const text = raw.trim();
  const upper = text.toUpperCase();
  let body = text
    .replace(/IDR|USD|SGD|MYR|AUD|EUR|GBP|JPY|CNY|HKD|PHP|THB|VND/gi, "")
    .replace(/Rp|rp/gi, "")
    .replace(/[$\\u00A3\\u20AC\\u00A5]/g, "")
    .trim();
  const lower = body.toLowerCase();
  let m = 1;
  for (const [key, mul] of Object.entries(UNIT_MULTIPLIERS)) {
    const re = new RegExp(
      \`(?<![\\\\w])\${escapeRegex(key)}(?![\\\\w])\`,
      "i",
    );
    if (re.test(lower)) {
      m = mul;
      console.log("MATCH", key, "->", mul, "lower=", JSON.stringify(lower));
      break;
    }
  }
  const r = _orig(raw);
  console.log("RESULT", JSON.stringify(raw), "->", JSON.stringify(r), "multiplier=", m);
  return r;
};
const got = parseSalaryString("Rp 1.2 milyar");
console.log("FINAL:", JSON.stringify(got));
`;
require("fs").writeFileSync("/tmp/wrap_runner.mjs", wrapped);
