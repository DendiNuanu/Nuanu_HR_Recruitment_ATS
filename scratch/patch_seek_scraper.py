#!/usr/bin/env python3
"""Patch /home/dendy/seek-scraper/scraper.js to send seekProfileId + salary fields to ATS."""

SCRAPER = '/home/dendy/seek-scraper/scraper.js'

with open(SCRAPER, 'r') as f:
    content = f.read()

# ── PATCH 1: buildApiCandidatePayload ──────────────────────────────────────
OLD1 = (
    'function buildApiCandidatePayload(c, { includeResume = true } = {}) {\n'
    '  const payload = {\n'
    '    name: c.name,\n'
    '    email: c.email,\n'
    '    phone: c.phone,\n'
    '    appliedRole: c.appliedRole,\n'
    '    mostRecentRole: c.mostRecentRole,\n'
    '    seekStatus: c.seekStatus,\n'
    '    appliedAt: parseRelativeAppliedAtToIso(c.appliedAt),\n'
    '    profileUrl: c.profileUrl,\n'
    '    source: c.source,\n'
    '    location: c.location || null,\n'
    '    domicile: c.domicile || c.location || null,\n'
    '  };'
)

NEW1 = (
    'function buildApiCandidatePayload(c, { includeResume = true } = {}) {\n'
    '  // Extract stable SEEK profile UUID from profileUrl (?selected=UUID)\n'
    '  const _seekIdMatch = (c.profileUrl || "").match(/[?&]selected=([0-9a-f-]{36})/i);\n'
    '  const seekProfileId = _seekIdMatch ? _seekIdMatch[1] : null;\n'
    '\n'
    '  const payload = {\n'
    '    name: c.name,\n'
    '    email: c.email,\n'
    '    phone: c.phone,\n'
    '    appliedRole: c.appliedRole,\n'
    '    mostRecentRole: c.mostRecentRole,\n'
    '    seekStatus: c.seekStatus,\n'
    '    appliedAt: parseRelativeAppliedAtToIso(c.appliedAt),\n'
    '    profileUrl: c.profileUrl,\n'
    '    source: c.source,\n'
    '    location: c.location || null,\n'
    '    domicile: c.domicile || c.location || null,\n'
    '    // FIX: stable identity key — ATS uses this to prevent rejected->new rollback\n'
    '    seekProfileId: seekProfileId || null,\n'
    '    // FIX: salary fields — set by captureProfileDetails() from SEEK profile tab\n'
    '    expectedSalaryRaw: c.expectedSalaryRaw || null,\n'
    '    salaryExpectation: c.salaryExpectation || null,\n'
    '  };'
)

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('[PATCH 1] buildApiCandidatePayload salary+seekProfileId — OK')
else:
    print('[PATCH 1] buildApiCandidatePayload — NOT FOUND (check if already patched)')

with open(SCRAPER, 'w') as f:
    f.write(content)

print('Patch complete.')
