#!/bin/bash
# =============================================================================
# Migrate all resume files from Supabase Storage to local droplet filesystem.
# Run: bash /root/Nuanu_HR_Recruitment_ATS/scripts/migrate-resumes.sh
# =============================================================================
set -euo pipefail

DB_USER="nuanu_app"
DB_PASS="LDaQzzwDOq/f8wRSvgNuSPw8rESzlRAeJKV0VGhbbpg="
DB_HOST="127.0.0.1"
DB_NAME="nuanu_hr_ats"
export PGPASSWORD="$DB_PASS"

UPLOADS_DIR="/root/Nuanu_HR_Recruitment_ATS/public/uploads/resumes"
APP_URL="https://hr-ats.nuanu.site"
TEMP_DIR="/tmp/resume-migration"

mkdir -p "$UPLOADS_DIR" "$TEMP_DIR"

echo "=== Extracting Supabase resume URLs from DB ==="
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -F'|' \
  -c "SELECT id, \"resumeUrl\" FROM candidate_profiles WHERE \"resumeUrl\" LIKE '%supabase%'" \
  > "$TEMP_DIR/urls.txt"

TOTAL=$(wc -l < "$TEMP_DIR/urls.txt")
echo "Total profiles: $TOTAL"
echo ""

COUNT=0
OK=0
SKIP=0
FAIL=0

while IFS='|' read -r id url; do
  COUNT=$((COUNT + 1))
  filename=$(basename "$url" | sed 's/%20/_/g')
  local_path="$UPLOADS_DIR/$filename"
  new_url="$APP_URL/uploads/resumes/$filename"
  
  printf "[%d/%d] %s ... " "$COUNT" "$TOTAL" "$filename"
  
  if [ -f "$local_path" ]; then
    echo "SKIP (exists)"
    SKIP=$((SKIP + 1))
  else
    if curl -s -f -o "$local_path" "$url" --max-time 60; then
      echo "OK"
      OK=$((OK + 1))
    else
      echo "FAIL"
      FAIL=$((FAIL + 1))
    fi
  fi
  
  # Update DB URL regardless (transform Supabase → local)
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -q \
    -c "UPDATE candidate_profiles SET \"resumeUrl\" = '${new_url}' WHERE id = '${id}'"
done < "$TEMP_DIR/urls.txt"

echo ""
echo "=== Migration Complete ==="
echo "Total:    $TOTAL"
echo "OK:       $OK"
echo "Skipped:  $SKIP"
echo "Failed:   $FAIL"

echo ""
echo "=== Verification ==="
LOCAL_FILES=$(find "$UPLOADS_DIR" -type f | wc -l)
REMAINING=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A \
  -c "SELECT COUNT(*) FROM candidate_profiles WHERE \"resumeUrl\" LIKE '%supabase%'")

echo "Local resume files:      $LOCAL_FILES"
echo "Remaining Supabase URLs: $REMAINING"
echo "=== Done ==="