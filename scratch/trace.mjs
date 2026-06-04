// Test with actual file
const fs = require("fs");
const src = fs.readFileSync("/home/dendy/seek-scraper/seek-extract.js", "utf8");
const start = src.indexOf("// --- Salary extraction");
const end = src.indexOf("/**\n * Click a Past-applicants row", start);
const helpers = src.slice(start, end);

// Inject a console.log right before the final Math.round
const debugHelpers = helpers.replace(
  "result.amount = Math.round(n * multiplier);",
  `console.log("DEBUG: n=", n, "multiplier=", multiplier, "numStr=", JSON.stringify(numStr), "body=", JSON.stringify(body));
   result.amount = Math.round(n * multiplier);`,
);

const m = { exports: {} };
new Function("exports", "module", debugHelpers + "\nmodule.exports = { parseSalaryString };")(
  m.exports,
  m,
);

console.log("=== Calling parseSalaryString('Rp 1.2 milyar') ===");
const r = m.exports.parseSalaryString("Rp 1.2 milyar");
console.log("Result:", JSON.stringify(r));
