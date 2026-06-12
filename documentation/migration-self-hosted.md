# Nuanu HR Recruitment ATS — Self-Hosted Migration Guide
## Supabase → Proxmox Ubuntu Server (10.1.4.244)

---

## ⚠️ PRE-FLIGHT ANALYSIS

### What this app depends on:

| Component | Current | After Migration |
|-----------|---------|-----------------|
| PostgreSQL DB | Supabase (`jflqzmryivcyogwadlsz.supabase.co`) | Local PostgreSQL on 10.1.4.244 |
| File Storage (resumes, offers PDFs) | **Supabase Storage** bucket `resumes` | Local filesystem: `public/uploads/` |
| Redis | **NOT used** — `src/lib/cache.ts` wraps Next.js `unstable_cache` | No change needed |
| Email | Resend API | Resend API (unchanged) |
| AI Scoring | Groq Cloud API | Groq Cloud API (unchanged) |
| Google Calendar | Google API | Google API (unchanged) |
| Socket.io | Built-in | Works out of the box |

### 🔴 CRITICAL: Supabase Storage files MUST be migrated

Your app stores resumes and offer PDFs in Supabase Storage (bucket: `resumes`). These are referenced by URL in the database (e.g., `candidate_profiles.resumeUrl`, `documents.fileUrl`, `offers.documentUrl`). The code pattern is:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && supabaseKey) { /* upload to supabase */ }
```

**If both env vars are missing, uploads silently fail** (returns `null`). We will:
1. Download all files from Supabase Storage bucket `resumes`
2. Transfer them to the server's `public/uploads/` directory
3. Patch the code to save to local filesystem instead
4. Update DB URLs from `https://jflqzmryivcyogwadlsz.supabase.co/storage/v1/...` to `/uploads/...`

### Node.js version
No `engines` field in package.json. Next.js 16.2.4 requires Node 18+. We'll use **Node 20 LTS**.

---

## STAGE 1: INSTALL POSTGRESQL ON PROXMOX SERVER

Run these **on the Proxmox server** (SSH in first, then copy-paste each command):

### 1.1 SSH into the server
```bash
ssh nuanuhr@10.1.4.244
# Password: For-hr-2026!
```

### 1.2 Install PostgreSQL 16
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
```

### 1.3 Verify it's running
```bash
sudo systemctl status postgresql
```

### 1.4 Create the database
```bash
sudo -u postgres psql -c "CREATE DATABASE nuanu_hr_ats;"
```

### 1.5 Create app user with password
```bash
sudo -u postgres psql -c "CREATE USER nuanuhr WITH PASSWORD 'For-hr-2026!';"
sudo -u postgres psql -c "ALTER USER nuanuhr CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nuanu_hr_ats TO nuanuhr;"
```

### 1.6 Grant schema permissions (PostgreSQL 15+ requires this)
```bash
sudo -u postgres psql -d nuanu_hr_ats -c "GRANT ALL ON SCHEMA public TO nuanuhr;"
sudo -u postgres psql -d nuanu_hr_ats -c "ALTER DATABASE nuanu_hr_ats OWNER TO nuanuhr;"
```

### 1.7 Test local login
```bash
psql -h localhost -U nuanuhr -d nuanu_hr_ats -c "SELECT version();"
# Enter password when prompted: For-hr-2026!
```

### 1.8 Secure PostgreSQL (local-only access)
```bash
# Find pg_hba.conf location
sudo -u postgres psql -c "SHOW hba_file;"
# Usually: /etc/postgresql/16/main/pg_hba.conf
```

Edit it:
```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Ensure these lines exist (replace any `scram-sha-256` for IPv4 if needed, but `md5` is fine for local):
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

**Make sure there is NO line like `host all all 0.0.0.0/0`** — that would expose Postgres to the internet.

### 1.9 Ensure PostgreSQL listens only on localhost
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Find `listen_addresses` and set:
```
listen_addresses = 'localhost'
```

### 1.10 Restart PostgreSQL
```bash
sudo systemctl restart postgresql
```

✅ **STAGE 1 DONE** — PostgreSQL is installed, secured, and ready.

---

## STAGE 2: DUMP DATA FROM SUPABASE

Run these **on your CachyOS machine** (where you have `pg_dump` access):

### 2.1 Install PostgreSQL client tools (if not already)
```bash
sudo pacman -S postgresql-libs postgresql
# OR if on apt-based:
# sudo apt install -y postgresql-client
```

### 2.2 Dump the Supabase database
```bash
pg_dump \
  --host=aws-1-ap-southeast-1.pooler.supabase.com \
  --port=6543 \
  --username=postgres.jflqzmryivcyogwadlsz \
  --dbname=postgres \
  --format=custom \
  --file=nuanu_hr_ats_dump.dump \
  --verbose \
  --no-owner \
  --no-acl
```
Password when prompted: `Fujimori6Riho#`

> **Note**: `--no-owner` and `--no-acl` strip Supabase-specific role/ownership that won't exist locally.

### 2.3 Verify dump was created
```bash
ls -lh nuanu_hr_ats_dump.dump
```
Should show a file size (likely 5-50 MB depending on your data).

### 2.4 Record Supabase row counts BEFORE transfer
```bash
PGPASSWORD='Fujimori6Riho#' psql \
  --host=aws-1-ap-southeast-1.pooler.supabase.com \
  --port=6543 \
  --username=postgres.jflqzmryivcyogwadlsz \
  --dbname=postgres \
  -c "SELECT 'users' AS tbl, count(*) FROM users
      UNION ALL SELECT 'vacancies', count(*) FROM vacancies
      UNION ALL SELECT 'applications', count(*) FROM applications
      UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
      UNION ALL SELECT 'interviews', count(*) FROM interviews
      UNION ALL SELECT 'offers', count(*) FROM offers
      UNION ALL SELECT 'departments', count(*) FROM departments
      UNION ALL SELECT 'roles', count(*) FROM roles
      UNION ALL SELECT 'documents', count(*) FROM documents
      UNION ALL SELECT 'notifications', count(*) FROM notifications
      UNION ALL SELECT 'pipeline_stages', count(*) FROM pipeline_stages
      UNION ALL SELECT 'onboarding_tasks', count(*) FROM onboarding_tasks
      UNION ALL SELECT 'assessments', count(*) FROM assessments
      UNION ALL SELECT 'candidate_scores', count(*) FROM candidate_scores
      UNION ALL SELECT 'reference_checks', count(*) FROM reference_checks
      ORDER BY tbl;"
```

**Save this output** — you'll compare against it in Stage 3.

✅ **STAGE 2 DONE** — Dump file created, row counts recorded.

---

## STAGE 3: TRANSFER & RESTORE TO LOCAL POSTGRESQL

### 3.1 Transfer the dump to the server
```bash
scp nuanu_hr_ats_dump.dump nuanuhr@10.1.4.244:/home/nuanuhr/
```

### 3.2 SSH into the server
```bash
ssh nuanuhr@10.1.4.244
```

### 3.3 Restore the dump
```bash
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=nuanuhr \
  --dbname=nuanu_hr_ats \
  --verbose \
  --no-owner \
  --no-acl \
  --exit-on-error \
  /home/nuanuhr/nuanu_hr_ats_dump.dump
```
Password: `For-hr-2026!`

> If you see errors about extensions (e.g., `pgbouncer`, `supabase_vault`), those are safe to ignore. If you see errors about `public` schema or table creation, stop and report them.

### 3.4 Verify row counts on local PostgreSQL
```bash
psql -h localhost -U nuanuhr -d nuanu_hr_ats <<'SQL'
SELECT 'users' AS tbl, count(*) FROM users
UNION ALL SELECT 'vacancies', count(*) FROM vacancies
UNION ALL SELECT 'applications', count(*) FROM applications
UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
UNION ALL SELECT 'interviews', count(*) FROM interviews
UNION ALL SELECT 'offers', count(*) FROM offers
UNION ALL SELECT 'departments', count(*) FROM departments
UNION ALL SELECT 'roles', count(*) FROM roles
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'pipeline_stages', count(*) FROM pipeline_stages
UNION ALL SELECT 'onboarding_tasks', count(*) FROM onboarding_tasks
UNION ALL SELECT 'assessments', count(*) FROM assessments
UNION ALL SELECT 'candidate_scores', count(*) FROM candidate_scores
UNION ALL SELECT 'reference_checks', count(*) FROM reference_checks
ORDER BY tbl;
SQL
```
Password: `For-hr-2026!`

Compare every row count against the Supabase output from Stage 2.4. They must match exactly.

### 3.5 Test a sample query
```bash
psql -h localhost -U nuanuhr -d nuanu_hr_ats -c "SELECT id, email, name FROM users LIMIT 5;"
```

✅ **STAGE 3 DONE** — Data migrated and verified.

---

## STAGE 4: SETUP NODE.JS + PM2 + NGINX

Run these **on the Proxmox server** (already SSH'd in).

### 4.1 Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should show v20.x.x
npm --version
```

### 4.2 Install PM2 globally
```bash
sudo npm install -g pm2
pm2 --version
```

### 4.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 4.4 Configure UFW firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Postgres 5432 is NOT opened — local-only
sudo ufw --force enable
sudo ufw status verbose
```
Expected output:
```
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (OpenSSH)           ALLOW IN    Anywhere
```

### 4.5 Enable PM2 auto-start on reboot
```bash
pm2 startup systemd -u nuanuhr --hp /home/nuanuhr
```
It will print a `sudo` command — copy and run it.

✅ **STAGE 4 DONE** — Runtime stack installed.

---

## STAGE 5: DEPLOY THE APPLICATION

### 5.1 Transfer the project to the server

**Option A — rsync from CachyOS** (recommended, includes uncommitted changes):
```bash
# Run from your CachyOS machine:
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  ~/Nuanu_HR_Recruitment_ATS/ nuanuhr@10.1.4.244:/home/nuanuhr/Nuanu_HR_Recruitment_ATS/
```

**Option B — git clone** (if everything is committed and pushed):
```bash
# Run ON the server:
cd /home/nuanuhr
git clone https://github.com/DendiNuanu/Nuanu_HR_Recruitment_ATS.git
```
(Replace with your actual repo URL if different.)

### 5.2 Create the .env file on the server
```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
nano .env
```

Paste this (replace sensitive values with your actual keys):
```bash
# Database (LOCAL PostgreSQL)
DATABASE_URL="postgresql://nuanuhr:For-hr-2026!@localhost:5432/nuanu_hr_ats"
DIRECT_URL="postgresql://nuanuhr:For-hr-2026!@localhost:5432/nuanu_hr_ats"

# Auth
JWT_SECRET=nuanu-ats-production-secret-change-me-2024
JWT_EXPIRES_IN=7d

# App
NEXT_PUBLIC_APP_URL=http://10.1.4.244
NEXT_PUBLIC_APP_NAME="Nuanu HR Recruitment ATS"

# Supabase Storage — LEAVE EMPTY to trigger local filesystem fallback
# (We'll patch the code in Stage 5.5)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# AI Configuration (Groq Cloud)
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_API_KEY=gsk_xxxxxxxxxxxx
AI_MODEL=qwen-2.5-32b

# Google Calendar API
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback

# SEEK Employer scraper
SEEK_IMPORT_KEY=your-seek-import-key

# JobStreet webhook (optional)
JOBSTREET_WEBHOOK_SECRET=
```

### 5.3 Install dependencies
```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
npm install --production
```

### 5.4 Generate Prisma client
```bash
npx prisma generate
```

### 5.5 PATCH: Migrate file storage from Supabase to local filesystem

This is the critical code change. We need to replace all Supabase Storage uploads with local filesystem writes.

#### 5.5.1 Patch `src/lib/resume-storage.ts`

```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
cat > src/lib/resume-storage.ts << 'ENDOFFILE'
/**
 * Upload resume buffers to local filesystem (public/uploads/resumes/).
 * Formerly used Supabase Storage; now fully self-hosted.
 */
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "resumes");

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function guessResumeMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export async function uploadResumeBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  try {
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error("Resume file exceeds 10 MB limit");
    }

    await ensureUploadsDir();

    const safeFilename = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    await fs.writeFile(filePath, buffer);

    // Return a URL relative to the app root
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://10.1.4.244";
    return `${appUrl}/uploads/resumes/${safeFilename}`;
  } catch (err: any) {
    console.warn("[resume-storage] Upload failed:", err.message);
    return null;
  }
}

export async function uploadResumeBase64(
  resumeBase64: string,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  const buffer = Buffer.from(resumeBase64, "base64");
  if (buffer.length < 100) return null;
  return uploadResumeBuffer(buffer, fileName, mimeType);
}
ENDOFFILE
```

#### 5.5.2 Patch `src/app/api/candidates/upload-cv/route.ts`

The current code checks `supabaseUrl && supabaseKey` and imports Supabase. We need to make it use `uploadResumeBuffer` directly. Let me show the patch locations in the four affected files:

**Files that need patching** (the Supabase storage upload pattern):

| File | What it uploads |
|------|-----------------|
| [`src/lib/resume-storage.ts`](src/lib/resume-storage.ts) | ✅ Already patched above |
| [`src/app/api/apply/route.ts`](src/app/api/apply/route.ts) (~line 96-120) | Resume from public job application |
| [`src/app/api/candidates/upload-cv/route.ts`](src/app/api/candidates/upload-cv/route.ts) (~line 66-90) | CV upload from dashboard |
| [`src/app/dashboard/candidates/actions.ts`](src/app/dashboard/candidates/actions.ts) (~line 586-605) | CV from candidate import |
| [`src/app/dashboard/offers/actions.ts`](src/app/dashboard/offers/actions.ts) (~line 116-135) | Offer PDF generation |

For each file, the pattern to replace:

**OLD pattern** (Supabase-dependent):
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && supabaseKey) {
  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const supabase = getSupabaseAdmin();
  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storagePath = `resumes/${safeFilename}`;
  const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, buffer, { contentType, upsert: false });
  if (!uploadError) {
    const { data } = supabase.storage.from("resumes").getPublicUrl(storagePath);
    resumeUrl = data.publicUrl;
  }
}
```

**NEW pattern** (local filesystem):
```typescript
if (buffer) {
  const { uploadResumeBuffer } = await import("@/lib/resume-storage");
  resumeUrl = await uploadResumeBuffer(buffer, file.name, file.type) || "";
}
```

Run these manual `nano` edits on the server for each file. I'll provide exact sed commands:

```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS

# Create a helper: uploadResumeFromFile function
# We'll add a helper to resume-storage.ts and use it everywhere
cat >> src/lib/resume-storage.ts << 'ENDOFFILE'

/**
 * Upload a File object (from FormData) to local storage.
 * Returns the public URL or empty string.
 */
export async function uploadResumeFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await uploadResumeBuffer(buffer, file.name, file.type);
  return result || "";
}
ENDOFFILE
```

Now on your CachyOS, after you rsync, edit these files:

**For Stage 5.5 execution**, after rsyncing to the server, run these commands:

```bash
# Patch src/lib/resume-storage.ts (rewrite entire file)
cat > /home/nuanuhr/Nuanu_HR_Recruitment_ATS/src/lib/resume-storage.ts << 'ENDOFFILE'
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "resumes");

async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function guessResumeMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export async function uploadResumeBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  try {
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error("Resume file exceeds 10 MB limit");
    }
    await ensureUploadsDir();
    const safeFilename = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);
    await fs.writeFile(filePath, buffer);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://10.1.4.244";
    return `${appUrl}/uploads/resumes/${safeFilename}`;
  } catch (err: any) {
    console.warn("[resume-storage] Upload failed:", err.message);
    return null;
  }
}

export async function uploadResumeBase64(
  resumeBase64: string,
  fileName: string,
  mimeType?: string,
): Promise<string | null> {
  const buffer = Buffer.from(resumeBase64, "base64");
  if (buffer.length < 100) return null;
  return uploadResumeBuffer(buffer, fileName, mimeType);
}

export async function uploadResumeFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await uploadResumeBuffer(buffer, file.name, file.type);
  return result || "";
}
ENDOFFILE
```

On your CachyOS machine, BEFORE rsyncing, let me provide the actual surgical patches you need:

#### File: `src/app/api/apply/route.ts` — Replace Supabase block
Find the block starting around line 96 (`let resumeUrl = ""` ... through the supabase upload), and replace with:
```typescript
    let resumeUrl = "";
    if (resumeBuffer) {
      const { uploadResumeBuffer } = await import("@/lib/resume-storage");
      resumeUrl = await uploadResumeBuffer(resumeBuffer, resumeFile.name, resumeFile.type) || "";
    }
```

#### File: `src/app/api/candidates/upload-cv/route.ts` — Replace Supabase block
Find the supabase upload block around line 66-90 and replace with:
```typescript
  try {
    if (buffer) {
      const { uploadResumeBuffer } = await import("@/lib/resume-storage");
      resumeUrl = await uploadResumeBuffer(buffer, file.name, file.type) || "";
    }
```

#### File: `src/app/dashboard/candidates/actions.ts` — Replace Supabase block (~line 586-605)
Replace with:
```typescript
    let resumeUrl = "";
    if (buffer) {
      const { uploadResumeBuffer } = await import("@/lib/resume-storage");
      resumeUrl = await uploadResumeBuffer(buffer, file.name, file.type) || "";
    }
```

#### File: `src/app/dashboard/offers/actions.ts` — Replace Supabase block (~line 116-135)
Replace with:
```typescript
    let documentUrl = "";
    if (pdfBuffer) {
      const { uploadResumeBuffer } = await import("@/lib/resume-storage");
      const fileName = `offer-${offerId}-${Date.now()}.pdf`;
      documentUrl = await uploadResumeBuffer(pdfBuffer, fileName, "application/pdf") || "";
    }
```

#### File: `src/app/dashboard/candidates/CandidatesTable.tsx` — Remove Supabase warning
Find around line 2169 the warning about `NEXT_PUBLIC_SUPABASE_URL` and remove or change that message.

**RECOMMENDATION**: Make these edits on your CachyOS machine FIRST, then rsync the whole project. That way you have source control.

### 5.6 Download & transfer Supabase Storage files to local

**On your CachyOS machine**, list all files in the Supabase `resumes` bucket:
```bash
# You need the supabase CLI or use the JS SDK. Quickest way — use a script:
cd ~/Nuanu_HR_Recruitment_ATS
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://jflqzmryivcyogwadlsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbHF6bXJ5aXZjeW9nd2FkbHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTk0MTcsImV4cCI6MjA5MzY3NTQxN30.LekBNN0gDHVlVrgrHCqzR9eMJuCXtTk4lqb2J4s6hTg'
);
async function main() {
  const { data, error } = await supabase.storage.from('resumes').list('', { limit: 1000 });
  if (error) { console.error(error); return; }
  console.log(data.map(f => f.name).join('\n'));
  console.log('Total files:', data.length);
}
main();
"
```

To actually download them, create a download script:
```bash
cd ~/Nuanu_HR_Recruitment_ATS
cat > download-supabase-files.mjs << 'EOF'
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(
  "https://jflqzmryivcyogwadlsz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbHF6bXJ5aXZjeW9nd2FkbHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTk0MTcsImV4cCI6MjA5MzY3NTQxN30.LekBNN0gDHVlVrgrHCqzR9eMJuCXtTk4lqb2J4s6hTg"
);

const OUT_DIR = path.join(process.cwd(), "supabase-files-export");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function downloadRecursive(prefix = "") {
  const { data: items, error } = await supabase.storage.from("resumes").list(prefix, { limit: 1000 });
  if (error) { console.error("List error:", error); return; }

  for (const item of items) {
    if (item.metadata) continue; // skip metadata entries
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (!item.id) {
      // It's a folder — recurse
      await downloadRecursive(fullPath);
      continue;
    }

    const { data, error: dlError } = await supabase.storage.from("resumes").download(fullPath);
    if (dlError) {
      console.error("Download error:", fullPath, dlError);
      continue;
    }
    const localPath = path.join(OUT_DIR, fullPath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(await data.arrayBuffer()));
    console.log("Downloaded:", fullPath);
  }
}

downloadRecursive().then(() => console.log("DONE — files in supabase-files-export/"));
EOF

node download-supabase-files.mjs
```

Then transfer them to the server:
```bash
scp -r supabase-files-export/resumes/* nuanuhr@10.1.4.244:/home/nuanuhr/Nuanu_HR_Recruitment_ATS/public/uploads/resumes/
```

### 5.7 Fix DB URLs (Supabase Storage URLs → local paths)

After migration, the database still has Supabase Storage URLs like:
```
https://jflqzmryivcyogwadlsz.supabase.co/storage/v1/object/public/resumes/xxx.pdf
```

Run this SQL on the server to update them:
```bash
psql -h localhost -U nuanuhr -d nuanu_hr_ats <<'SQL'
-- Update resume URLs in candidate_profiles
UPDATE candidate_profiles
SET "resumeUrl" = REPLACE("resumeUrl", 'https://jflqzmryivcyogwadlsz.supabase.co/storage/v1/object/public/resumes/', 'http://10.1.4.244/uploads/resumes/')
WHERE "resumeUrl" LIKE '%supabase.co/storage/v1/object/public/resumes/%';

-- Update file URLs in documents
UPDATE documents
SET "fileUrl" = REPLACE("fileUrl", 'https://jflqzmryivcyogwadlsz.supabase.co/storage/v1/object/public/resumes/', 'http://10.1.4.244/uploads/resumes/')
WHERE "fileUrl" LIKE '%supabase.co/storage/v1/object/public/resumes/%';

-- Update document URLs in offers
UPDATE offers
SET "documentUrl" = REPLACE("documentUrl", 'https://jflqzmryivcyogwadlsz.supabase.co/storage/v1/object/public/resumes/', 'http://10.1.4.244/uploads/resumes/')
WHERE "documentUrl" LIKE '%supabase.co/storage/v1/object/public/resumes/%';

-- Show how many rows were updated
SELECT 'candidate_profiles' AS tbl, count(*) FROM candidate_profiles WHERE "resumeUrl" LIKE '%/uploads/resumes/%'
UNION ALL SELECT 'documents', count(*) FROM documents WHERE "fileUrl" LIKE '%/uploads/resumes/%'
UNION ALL SELECT 'offers', count(*) FROM offers WHERE "documentUrl" LIKE '%/uploads/resumes/%';
SQL
```

### 5.8 Check migration status (DON'T run migrate deploy)
```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
npx prisma migrate status
```

This shows which migrations have been applied vs pending. Since you restored a full dump, the schema should already match. If it shows pending migrations, **report them** — we can evaluate whether to apply them.

### 5.9 Build the application
```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
npm run build
```

> This runs `prisma generate && tsx scripts/migrate.ts && next build`. The `scripts/migrate.ts` safely adds missing columns with `IF NOT EXISTS` — it won't overwrite data.

If the build fails, share the error output.

### 5.10 Start with PM2
```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
pm2 start npm --name "nuanu-ats" -- start
pm2 save
pm2 status
```

✅ **STAGE 5 DONE** — App is deployed and running on localhost:3000.

---

## STAGE 6: NGINX REVERSE PROXY

### 6.1 Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/nuanu-ats
```

Paste:
```nginx
server {
    listen 80;
    server_name 10.1.4.244;

    # Increase body size for resume uploads (10 MB)
    client_max_body_size 10M;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    # Serve uploaded files directly (public/uploads)
    location /uploads/ {
        alias /home/nuanuhr/Nuanu_HR_Recruitment_ATS/public/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 6.2 Enable the site
```bash
sudo ln -sf /etc/nginx/sites-available/nuanu-ats /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t   # Test config
sudo systemctl reload nginx
```

### 6.3 Test from your CachyOS machine
```bash
curl -I http://10.1.4.244
```
Should return HTTP 200 with a Next.js response.

✅ **STAGE 6 DONE** — Nginx is proxying to the app on port 80.

---

## STAGE 7: VERIFICATION

### 7.1 Confirm the app is running
```bash
# On the server:
pm2 status
curl -s http://localhost:3000 | head -20
```

### 7.2 Confirm database connectivity
```bash
psql -h localhost -U nuanuhr -d nuanu_hr_ats -c "SELECT count(*) FROM users;"
```

### 7.3 Open in browser
Navigate to: **http://10.1.4.244**

Try:
- Log in with your existing credentials
- View candidates list
- Check that resume links work (no broken images/files)
- Create a test application with a resume upload

### 7.4 Check logs
```bash
pm2 logs nuanu-ats --lines 50
```

### 7.5 Deploy script for future updates

Create on the server:
```bash
cat > /home/nuanuhr/deploy.sh << 'ENDOFFILE'
#!/bin/bash
set -e

echo "=== Deploy Nuanu HR ATS ==="
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS

echo "[1/5] Pulling latest code..."
git pull origin main

echo "[2/5] Installing dependencies..."
npm install --production

echo "[3/5] Generating Prisma client..."
npx prisma generate

echo "[4/5] Building..."
npm run build

echo "[5/5] Restarting PM2..."
pm2 restart nuanu-ats
pm2 save

echo "=== Deploy complete ==="
pm2 status
ENDOFFILE

chmod +x /home/nuanuhr/deploy.sh
```

✅ **STAGE 7 DONE** — All set!

---

## 🚨 TROUBLESHOOTING

### Build fails with "Supabase env vars missing"
The `getSupabaseAdmin()` function in [`src/lib/supabase.ts`](src/lib/supabase.ts) throws an error if `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are missing. Since we patched all callers to use local storage, `getSupabaseAdmin()` should no longer be called. If it still is:

```bash
cd /home/nuanuhr/Nuanu_HR_Recruitment_ATS
grep -rn "getSupabaseAdmin" src/ --include="*.ts" --include="*.tsx"
```

Any remaining callers need to be patched OR you can stub the env vars:
```bash
# Add dummy values to .env so the import doesn't crash at build time
echo 'NEXT_PUBLIC_SUPABASE_URL=https://placeholder.local' >> .env
echo 'SUPABASE_SERVICE_ROLE_KEY=placeholder' >> .env
```

### Google Calendar redirect fails
Update your Google Cloud Console → OAuth consent → Authorized redirect URIs:
Add: `http://10.1.4.244/api/calendar/google/callback`

### SSL (when you have a domain)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Port 3000 is already in use
```bash
lsof -i :3000
kill -9 <PID>
```

---

## 📋 COMMAND INDEX (for quick reference)

| Stage | Command | Where |
|-------|---------|-------|
| 1.1 | SSH into server | CachyOS → server |
| 1.2 | Install PostgreSQL | Server |
| 1.4-1.6 | Create DB + user | Server |
| 2.2 | pg_dump from Supabase | CachyOS |
| 2.4 | Record row counts | CachyOS |
| 3.1 | scp dump to server | CachyOS |
| 3.3 | pg_restore | Server |
| 3.4 | Verify row counts | Server |
| 4.1 | Install Node.js 20 | Server |
| 4.2-4.3 | Install PM2 + Nginx | Server |
| 4.4 | Configure UFW | Server |
| 5.1 | rsync project | CachyOS |
| 5.5 | Patch storage code | CachyOS (before rsync) |
| 5.6 | Download Supabase files | CachyOS |
| 5.7 | Fix DB URLs | Server |
| 5.9 | npm run build | Server |
| 5.10 | pm2 start | Server |
| 6.1-6.2 | Nginx config | Server |
| 7.5 | Create deploy.sh | Server |