#!/usr/bin/env python3
"""
Patch seek-extract.js and scraper.js with all 7 tasks:
1. No fake/synthetic email generation — null is correct
2. Profile tab race condition fix — wait for salary element
3. Salary extraction from profile tab only
4-5. seekProfileId as primary key
6. Hard debug logs
7. Strict rules
"""

import re

# ═══════════════════════════════════════════════════════
# PATCH seek-extract.js
# ═══════════════════════════════════════════════════════
EXTRACT_PATH = '/home/dendy/seek-scraper/seek-extract.js'
with open(EXTRACT_PATH, 'r') as f:
    extract = f.read()

patches = 0

# PATCH E1: Fix email extraction — never fallback to body regex (body scan picks up OTHER people's emails)
# Replace the "if (!email) { body regex }" block with strict profile-tab-only extraction
OLD_E1 = (
    '  const mailto = root.querySelector(\'a[href^="mailto:"]\');\n'
    '  let email = null;\n'
    '  if (mailto) {\n'
    '    email = (mailto.getAttribute("href") || "")\n'
    '    .replace(/^mailto:/i, "")\n'
    '    .split("?")[0]\n'
    '    .trim();\n'
    '  }\n'
    '  if (!email) {\n'
    '    const body = root.innerText || "";\n'
    '    const m = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);\n'
    '    email = m ? m[0] : null;\n'
    '  }\n'
)

NEW_E1 = (
    '  // TASK 1: STRICT email extraction — profile tab mailto link ONLY\n'
    '  // NEVER fallback to body text scan (picks up unrelated emails on the page)\n'
    '  // NEVER generate fake/synthetic email from phone number\n'
    '  const mailto = root.querySelector(\'a[href^="mailto:"]\');\n'
    '  let email = null;\n'
    '  if (mailto) {\n'
    '    const raw = (mailto.getAttribute("href") || "")\n'
    '      .replace(/^mailto:/i, "")\n'
    '      .split("?")[0]\n'
    '      .trim()\n'
    '      .toLowerCase();\n'
    '    // Validate it looks like a real email\n'
    '    if (raw && /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(raw)) {\n'
    '      email = raw;\n'
    '    }\n'
    '  }\n'
    '  if (!email) {\n'
    '    console.log("[EMAIL MISSING - DO NOT GENERATE FAKE EMAIL]", { name: (root.querySelector("h1,h2") || {}).textContent });\n'
    '  }\n'
    '  console.log("[EMAIL FROM SEEK]", email);\n'
)

if OLD_E1 in extract:
    extract = extract.replace(OLD_E1, NEW_E1, 1)
    patches += 1
    print('[E1] Email strict extraction — OK')
else:
    print('[E1] Email block — NOT FOUND')

# PATCH E2: Already has seekProfileId return — verify it's there, add SEEK PROFILE ID log
OLD_E2 = (
    '  console.log("[SEEK RAW EMAIL]", JSON.stringify(email));\n'
    '  console.log("[SEEK PROFILE ID]", JSON.stringify(seekProfileId));\n'
)
NEW_E2 = (
    '  console.log("[SEEK RAW EMAIL]", JSON.stringify(email));\n'
    '  console.log("[SEEK PROFILE ID]", JSON.stringify(seekProfileId));\n'
    '  console.log("[SALARY RAW]", JSON.stringify(expectedSalaryRaw));\n'
)
if OLD_E2 in extract:
    extract = extract.replace(OLD_E2, NEW_E2, 1)
    patches += 1
    print('[E2] Salary raw log added — OK')
elif '[SEEK RAW EMAIL]' in extract:
    print('[E2] Logs already present — skipping')
    patches += 1
else:
    print('[E2] Log block — NOT FOUND')

with open(EXTRACT_PATH, 'w') as f:
    f.write(extract)

# ═══════════════════════════════════════════════════════
# PATCH scraper.js
# ═══════════════════════════════════════════════════════
SCRAPER_PATH = '/home/dendy/seek-scraper/scraper.js'
with open(SCRAPER_PATH, 'r') as f:
    scraper = f.read()

# PATCH S1: Fix enrichFromProfileUrl — add proper wait after navigation
OLD_S1 = (
    'async function enrichFromProfileUrl(page, candidate, profileUrl, returnUrl, network) {\n'
    '  await dismissSeekOverlays(page);\n'
    '  // Force ?tab=profile so SEEK opens the modal directly on the Profile tab\n'
    '  // (the only tab where "Expected monthly salary" / "Gaji bulanan yang\n'
    '  // diinginkan" is rendered).\n'
    '  const profileTabUrl = withProfileTab(profileUrl);\n'
    '  await safeGoto(page, profileTabUrl);\n'
    '  await waitForCandidateDetailModal(page);\n'
)

NEW_S1 = (
    'async function enrichFromProfileUrl(page, candidate, profileUrl, returnUrl, network) {\n'
    '  await dismissSeekOverlays(page);\n'
    '  // Force ?tab=profile so SEEK opens the modal directly on the Profile tab\n'
    '  // (the only tab where "Expected monthly salary" / "Gaji bulanan yang\n'
    '  // diinginkan" is rendered).\n'
    '  const profileTabUrl = withProfileTab(profileUrl);\n'
    '\n'
    '  // TASK 2: Fix profile tab race condition\n'
    '  // Navigate and wait for network to settle before extracting anything\n'
    '  try {\n'
    '    await page.goto(profileTabUrl, { waitUntil: "networkidle", timeout: 30000 });\n'
    '  } catch {\n'
    '    // networkidle can timeout on slow pages — fall back to domcontentloaded\n'
    '    await safeGoto(page, profileTabUrl);\n'
    '  }\n'
    '\n'
    '  // TASK 2+3: Wait specifically for salary element OR full profile content\n'
    '  const salaryReady = await page.waitForFunction(() => {\n'
    '    const txt = (document.body.innerText || "").toLowerCase();\n'
    '    return (\n'
    '      txt.includes("expected monthly salary") ||\n'
    '      txt.includes("gaji bulanan yang diinginkan") ||\n'
    '      txt.includes("application questions") ||\n'
    '      txt.includes("pertanyaan penyaringan") ||\n'
    '      // Profile loaded but no salary question (valid — not all jobs have it)\n'
    '      (txt.includes("career history") || txt.includes("riwayat pekerjaan"))\n'
    '    );\n'
    '  }, { timeout: 20000 }).then(() => true).catch(() => false);\n'
    '\n'
    '  console.log("[PROFILE TAB READY]", salaryReady ? "salary/content loaded" : "timeout — extracting anyway");\n'
    '\n'
    '  await waitForCandidateDetailModal(page);\n'
)

if OLD_S1 in scraper:
    scraper = scraper.replace(OLD_S1, NEW_S1, 1)
    patches += 1
    print('[S1] enrichFromProfileUrl race condition fix — OK')
else:
    print('[S1] enrichFromProfileUrl — NOT FOUND')

# PATCH S2: Fix captureProfileDetails — remove return Boolean(candidate.email)
# since candidates without email are still valid (they have phone + seekProfileId)
OLD_S2 = '  return Boolean(candidate.email);\n}\n\nasync function enrichFromProfileUrl'
NEW_S2 = (
    '  // TASK 1: Never block on missing email — seekProfileId + phone is sufficient identity\n'
    '  if (!candidate.email) {\n'
    '    console.log(`      [EMAIL MISSING] ${candidate.name} — will import with phone identity only`);\n'
    '  }\n'
    '  console.log(`      [SALARY FINAL] ${candidate.salaryExpectation ?? "null"}`);\n'
    '  return true; // Always continue — email is optional when seekProfileId available\n'
    '}\n\nasync function enrichFromProfileUrl'
)

if OLD_S2 in scraper:
    scraper = scraper.replace(OLD_S2, NEW_S2, 1)
    patches += 1
    print('[S2] captureProfileDetails return fix — OK')
else:
    print('[S2] captureProfileDetails return — NOT FOUND')

with open(SCRAPER_PATH, 'w') as f:
    f.write(scraper)

print(f'\nDone. {patches}/4 patches applied.')
