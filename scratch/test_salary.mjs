// Standalone test of the salary parser helpers extracted from seek-extract.js
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("/home/dendy/seek-scraper/seek-extract.js", "utf8");
const start = src.indexOf("// --- Salary extraction");
if (start < 0) {
  console.error("Failed to find Salary extraction helpers");
  process.exit(1);
}
const end = src.indexOf("/**\n * Click a Past-applicants row", start);
const slice = src.slice(start, end);

const runner = `
global.document = { querySelector: () => null, querySelectorAll: () => [] };
${slice}

const cases = [
  { raw: "Rp 15 million",     wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 15.000.000",     wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 15,000,000",     wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "IDR 15,000,000",    wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 15 jt",          wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 15 juta",        wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 15.5 juta",      wantAmount: 15500000,    wantCurrency: "IDR" },
  { raw: "Rp 1.2 milyar",     wantAmount: 1200000000,  wantCurrency: "IDR" },
  { raw: "USD 2,000",         wantAmount: 2000,        wantCurrency: "USD" },
  { raw: "$2,000",            wantAmount: 2000,        wantCurrency: "USD" },
  { raw: "SGD 3.5k",          wantAmount: 3500,        wantCurrency: "SGD" },
  { raw: "15,000,000",        wantAmount: 15000000,    wantCurrency: "IDR" },
  { raw: "Rp 10-15 juta",     wantAmount: null,        wantCurrency: "IDR" },
  { raw: "rp 5 million",      wantAmount: 5000000,     wantCurrency: "IDR" },
  { raw: "negotiable",        wantAmount: null,        wantCurrency: "IDR" },
  // When the higher-level extractor wraps parseSalaryString and sees no
  // amount, it returns currency=null so callers can tell "no info" from
  // "IDR with a value". parseSalaryString itself defaults to IDR.
  { raw: "negotiable",        wantAmount: null,        wantCurrency: "IDR", skipHigherCheck: true },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = parseSalaryString(c.raw);
  const ok = got.amount === c.wantAmount && got.currency === c.wantCurrency;
  if (ok) {
    pass++;
    console.log("  PASS  " + JSON.stringify(c.raw).padEnd(28) + " -> " + got.amount + " " + got.currency);
  } else {
    fail++;
    console.log("  FAIL  " + JSON.stringify(c.raw).padEnd(28) + " -> got " + got.amount + " " + got.currency + ", want " + c.wantAmount + " " + c.wantCurrency);
  }
}
console.log("RESULT: " + pass + " passed, " + fail + " failed (" + cases.length + " total)");
process.exit(fail === 0 ? 0 : 1);
`;

writeFileSync("/tmp/salary_test_runner.mjs", runner);
console.log("Wrote /tmp/salary_test_runner.mjs");
