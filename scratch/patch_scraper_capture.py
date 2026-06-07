#!/usr/bin/env python3
"""Patch scraper.js: copy seekProfileId from detail into candidate in captureProfileDetails."""

SCRAPER = '/home/dendy/seek-scraper/scraper.js'

with open(SCRAPER, 'r') as f:
    content = f.read()

OLD = (
    '  if (detail.email) candidate.email = detail.email;\n'
    '  if (detail.phone) candidate.phone = detail.phone;\n'
    '  if (detail.profileUrl) candidate.profileUrl = detail.profileUrl;\n'
)

NEW = (
    '  if (detail.email) candidate.email = detail.email;\n'
    '  if (detail.phone) candidate.phone = detail.phone;\n'
    '  if (detail.profileUrl) candidate.profileUrl = detail.profileUrl;\n'
    '  // FIX: propagate seekProfileId so ATS can use it as stable dedup key\n'
    '  if (detail.seekProfileId) candidate.seekProfileId = detail.seekProfileId;\n'
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('[PATCH] captureProfileDetails seekProfileId propagation — OK')
else:
    print('[PATCH] target block NOT FOUND')

with open(SCRAPER, 'w') as f:
    f.write(content)

print('Done.')
