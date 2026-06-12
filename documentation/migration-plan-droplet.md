# Nuanu HR ATS — Complete DigitalOcean Droplet Migration Plan

> **Target:** `https://hr-ats.nuanu.site` | **Droplet IP:** `168.144.36.41`  
> **Source server (keep running):** `10.1.4.244` (Proxmox VM)  
> **Date:** 2026-06-12 | **Node.js target:** 22.x LTS (Next.js 16.2.4 compatible)

---

## 0. PRE-FLIGHT — Generate Strong Secrets (run LOCALLY)

```bash
# Generate a strong password for the PostgreSQL app user (copy the output)
openssl rand -base64 32
# Example output: dGhpcyBpcyBhIHN0cm9uZyByYW5kb20gcGFzc3dvcmQK=

# Generate a new JWT_SECRET (copy the output)
openssl rand -base64 48
```

**Save these two values — you will paste them into `.env` on the droplet.**

---

## 1. DROPLET SETUP

SSH into the droplet and run the block below:

```bash
# SSH first: ssh root@168.144.36.41
# Then run this entire block:

# ── System update ──
apt update && apt upgrade -y

# ── Install prerequisites ──
apt install -y curl wget gnupg2 ca-certificates lsb-release git ufw nginx certbot python3-certbot-nginx build-essential

# ── Node.js 22.x LTS ──
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v && npm -v

# ── PM2 (global) ──
npm install -g pm2

# ── PostgreSQL latest ──
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt update
apt install -y postgresql postgresql-client
pg_config --version

# ── Start & enable PostgreSQL ──
systemctl enable postgresql
systemctl start postgresql

# ── UFW firewall ──
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
```

---

## 2. POSTGRESQL ON DROPLET — Database & User

```bash
# Replace <DB_PASSWORD> with the output from Stage 0's first openssl command
DB_PASSWORD="<PASTE_GENERATED_PASSWORD_HERE>"

sudo -u postgres psql <<SQL
-- Create database
CREATE DATABASE nuanu_hr_ats;

-- Create app user
CREATE USER nuanu_app WITH PASSWORD '${DB_PASSWORD}';

-- Grant full privileges on the database
GRANT ALL PRIVILEGES ON DATABASE nuanu_hr_ats TO nuanu_app;

-- Connect to the database and grant schema permissions
\c nuanu_hr_ats
GRANT ALL ON SCHEMA public TO nuanu_app;
GRANT CREATE ON SCHEMA public TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO nuanu_app;
SQL

# ── Secure PostgreSQL: localhost-only access ──
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | tr -d ' ')
echo "pg_hba.conf at: $PG_HBA"

# Ensure only md5/scram-sha-256 for IPv4 local connections (no trust, no remote)
sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+.*/host    all             all             127.0.0.1\/32            scram-sha-256/' "$PG_HBA"
sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+.*/host    all             all             ::1\/128                 scram-sha-256/' "$PG_HBA"

# Disable remote listening
PG_CONF=$(sudo -u postgres psql -t -c "SHOW config_file;" | tr -d ' ')
sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONF"
sed -i "s/^listen_addresses = '\*'/listen_addresses = 'localhost'/" "$PG_CONF"

systemctl restart postgresql

# ── Test connection ──
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U nuanu_app -d nuanu_hr_ats -c "SELECT 'OK' AS connection_test;"
```

---

## 3. DATA MIGRATION — pg_dump → scp → pg_restore

### 3a. ON THE OLD SERVER (`10.1.4.244`) — Dump the database

```bash
# SSH into old server first: ssh 10.1.4.244
# Dump in custom format (full schema + data + sequences)
pg_dump -h localhost -U postgres -d nuanu_hr_ats -Fc -f ~/nuanu_hr_ats_dump.dump
ls -lh ~/nuanu_hr_ats_dump.dump
```

### 3b. FROM LOCAL MACHINE — scp the dump from old server to droplet

```bash
# Run from your LOCAL machine (not either server)
# Fetch dump from old server
scp root@10.1.4.244:/root/nuanu_hr_ats_dump.dump ./nuanu_hr_ats_dump.dump
# Push dump to droplet
scp ./nuanu_hr_ats_dump.dump root@168.144.36.41:/root/nuanu_hr_ats_dump.dump
```

> **DESTRUCTIVE:** The next command will drop/recreate all data in the droplet database.

### 3c. ON THE DROPLET — Restore into nuanu_hr_ats

```bash
# ⚠️ DESTRUCTIVE — overwrites all existing data in nuanu_hr_ats on droplet

DB_PASSWORD="<PASTE_YOUR_DB_PASSWORD>"

# Drop and recreate public schema to ensure clean restore
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U nuanu_app -d nuanu_hr_ats <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nuanu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO nuanu_app;
SQL

# Restore
PGPASSWORD="$DB_PASSWORD" pg_restore -h 127.0.0.1 -U nuanu_app -d nuanu_hr_ats --no-owner --no-privileges -v ~/nuanu_hr_ats_dump.dump
```

### 3d. VERIFY ROW COUNTS — Run on BOTH old server AND droplet

```bash
# ── On OLD SERVER ──
sudo -u postgres psql -d nuanu_hr_ats -c "
SELECT 'users' AS tbl, count(*) FROM users
UNION ALL SELECT 'vacancies', count(*) FROM vacancies
UNION ALL SELECT 'applications', count(*) FROM applications
UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
UNION ALL SELECT 'interviews', count(*) FROM interviews
UNION ALL SELECT 'offers', count(*) FROM offers
UNION ALL SELECT 'employees', count(*) FROM employees
UNION ALL SELECT 'pipeline_stages', count(*) FROM pipeline_stages
UNION ALL SELECT 'candidate_scores', count(*) FROM candidate_scores
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'activity_logs', count(*) FROM activity_logs
UNION ALL SELECT 'reference_checks', count(*) FROM reference_checks
UNION ALL SELECT 'departments', count(*) FROM departments
UNION ALL SELECT 'job_requisitions', count(*) FROM job_requisitions
UNION ALL SELECT 'onboarding_tasks', count(*) FROM onboarding_tasks
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'interview_feedback', count(*) FROM interview_feedback
UNION ALL SELECT 'assessments', count(*) FROM assessments
ORDER BY tbl;
"

# ── On DROPLET ──
DB_PASSWORD="<PASTE_YOUR_DB_PASSWORD>"
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U nuanu_app -d nuanu_hr_ats -c "
SELECT 'users' AS tbl, count(*) FROM users
UNION ALL SELECT 'vacancies', count(*) FROM vacancies
UNION ALL SELECT 'applications', count(*) FROM applications
UNION ALL SELECT 'candidate_profiles', count(*) FROM candidate_profiles
UNION ALL SELECT 'interviews', count(*) FROM interviews
UNION ALL SELECT 'offers', count(*) FROM offers
UNION ALL SELECT 'employees', count(*) FROM employees
UNION ALL SELECT 'pipeline_stages', count(*) FROM pipeline_stages
UNION ALL SELECT 'candidate_scores', count(*) FROM candidate_scores
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'activity_logs', count(*) FROM activity_logs
UNION ALL SELECT 'reference_checks', count(*) FROM reference_checks
UNION ALL SELECT 'departments', count(*) FROM departments
UNION ALL SELECT 'job_requisitions', count(*) FROM job_requisitions
UNION ALL SELECT 'onboarding_tasks', count(*) FROM onboarding_tasks
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'interview_feedback', count(*) FROM interview_feedback
UNION ALL SELECT 'assessments', count(*) FROM assessments
ORDER BY tbl;
"
```

> All counts must match exactly before proceeding.

---

## 4. CODE TRANSFER — rsync project to droplet

```bash
# Run from LOCAL machine — this pushes the source code to the droplet
rsync -avz --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '*.dump' \
    --exclude '*.sql' \
    --exclude '.env' \
    ~/Nuanu_HR_Recruitment_ATS/ \
    root@168.144.36.41:/root/Nuanu_HR_Recruitment_ATS/
```

---

## 5. APP CONFIG — .env, install, build, PM2

### 5a. Create .env on the droplet

```bash
# SSH into droplet: ssh root@168.144.36.41
# Then create the .env file

DB_PASSWORD="<PASTE_YOUR_DB_PASSWORD>"
JWT_SECRET="<PASTE_JWT_SECRET_FROM_STAGE_0>"

cat > ~/Nuanu_HR_Recruitment_ATS/.env <<'ENVEOF'
# ── PostgreSQL ──
DATABASE_URL=postgresql://nuanu_app:DB_PASSWORD_PLACEHOLDER@127.0.0.1:5432/nuanu_hr_ats?schema=public
DIRECT_URL=postgresql://nuanu_app:DB_PASSWORD_PLACEHOLDER@127.0.0.1:5432/nuanu_hr_ats?schema=public

# ── App ──
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://hr-ats.nuanu.site
NEXT_PUBLIC_APP_NAME=Nuanu
JWT_SECRET=JWT_SECRET_PLACEHOLDER

# ── SEEK Import ──
SEEK_IMPORT_KEY=nuanu-seek-secret-2026

# ── Email ── FILL IN YOUR ACTUAL EMAIL CREDENTIALS BELOW
# BREVO (recommended):
# BREVO_API_KEY=
# BREVO_SENDER_EMAIL=
# BREVO_SENDER_NAME=Nuanu Recruitment

# SMTP (alternative):
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=

# Gmail (alternative):
# GMAIL_USER=
# GMAIL_APP_PASSWORD=

# Resend (alternative):
# RESEND_API_KEY=
# RESEND_FROM=Nuanu Recruitment <onboarding@resend.dev>

# ── AI / CV Parsing ── FILL IN IF USED
# AI_API_KEY=
# AI_API_URL=http://127.0.0.1:11434/v1/chat/completions
# AI_MODEL=qwen2.5
# OLLAMA_URL=http://localhost:11434

# ── Google Calendar ── FILL IN IF USED
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=

# ── Google Sheets ── FILL IN IF USED
# GOOGLE_SERVICE_ACCOUNT_JSON=
# TRACKING_SPREADSHEET_ID=
# CRON_SECRET=

# ── Supabase ── FILL IN IF USED
# NEXT_PUBLIC_SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=

# ── Telegram ── FILL IN IF USED
# TELEGRAM_BOT_TOKEN=8708236788:AAElOtlQE3fuFk9tbAbYM8mvsGLHJVMMsBY

# ── JobStreet Webhook ── FILL IN IF USED
# JOBSTREET_WEBHOOK_SECRET=

# ── Socket.io ── (leave unset for single-instance; set if separate socket server)
# NEXT_PUBLIC_SOCKET_URL=

# ── SEEK optional ──
# SEEK_AUTO_CREATE_VACANCIES=true
# SEEK_VACANCY_SITE_MANAGER=
# SEEK_VACANCY_ACCOUNTING_OFFICER=
# SEEK_VACANCY_SAFETY_OFFICER=
# SEEK_CHECKPOINT_PATH=
ENVEOF

# Inject actual password and JWT secret
sed -i "s/DB_PASSWORD_PLACEHOLDER/${DB_PASSWORD}/g" ~/Nuanu_HR_Recruitment_ATS/.env
sed -i "s/JWT_SECRET_PLACEHOLDER/${JWT_SECRET}/g" ~/Nuanu_HR_Recruitment_ATS/.env

# If your password contains special chars that break sed, use this instead:
# sed -i "s|DB_PASSWORD_PLACEHOLDER|${DB_PASSWORD}|g" ~/Nuanu_HR_Recruitment_ATS/.env

# Verify the .env was created correctly
grep -E 'DATABASE_URL|JWT_SECRET|NEXT_PUBLIC_APP_URL' ~/Nuanu_HR_Recruitment_ATS/.env
```

> **IMPORTANT:** After creating `.env`, copy over ALL populated environment variables from your old server's `.env` — especially email credentials (BREVO, SMTP, Gmail, or Resend), AI keys, Google Calendar OAuth, Telegram bot token, etc. The template above lists every `process.env` usage found in the codebase. **Without email credentials, the app cannot send notification emails.**

### 5b. Install dependencies, generate Prisma, check migrations, build

```bash
cd ~/Nuanu_HR_Recruitment_ATS

# Install production dependencies
npm install --production

# Prisma generate (creates Prisma Client from schema)
npx prisma generate

# ── CRITICAL: Check migration status BEFORE running any migrate command ──
# The restored database already has the schema (tables/indexes/constraints).
# Running `prisma migrate deploy` on a restored DB will try to create already-existing
# tables and FAIL, or worse, may reset things.
#
# DO THIS instead — check if Prisma sees the DB as up-to-date:
npx prisma migrate status

# If it reports "Database is up to date" → you're good, skip migrate entirely.
# If it reports pending migrations → those migrations are from manual SQL files
# that may already be applied. Run this to mark them as applied WITHOUT executing:
# npx prisma migrate resolve --applied <migration_name>
#
# SAFEST PATH: just skip prisma migrate entirely. The restored DB IS the source of truth.

# Build the Next.js app (this runs `npx prisma generate && npx tsx scripts/migrate.ts && next build` per package.json)
# ⚠️ NOTE: scripts/migrate.ts runs during build — ensure it's idempotent/safe on existing DB
npm run build
```

### 5c. Start with PM2

```bash
cd ~/Nuanu_HR_Recruitment_ATS

# Start the Next.js app
pm2 start npm --name "nuanu-hr" -- start

# Verify it's running
pm2 status
pm2 logs nuanu-hr --lines 20 --nostream

# Save PM2 process list (auto-restart on reboot)
pm2 save

# Generate startup script (run the output command)
pm2 startup systemd
# ^ This prints a sudo command — copy and run it
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

## 6. NGINX + SSL

### 6a. Nginx server block

```bash
cat > /etc/nginx/sites-available/hr-ats.nuanu.site <<'NGINX'
# HTTP → HTTPS redirect (Certbot will modify this)
server {
    listen 80;
    listen [::]:80;
    server_name hr-ats.nuanu.site www.hr-ats.nuanu.site;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/hr-ats.nuanu.site /etc/nginx/sites-enabled/

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload
systemctl reload nginx
```

### 6b. Obtain SSL certificate

```bash
# Obtain cert (this also modifies the nginx config to add the HTTPS server block)
certbot --nginx -d hr-ats.nuanu.site -d www.hr-ats.nuanu.site --non-interactive --agree-tos -m admin@nuanu.site

# Verify auto-renewal timer
systemctl status certbot.timer
certbot renew --dry-run
```

### 6c. Finalize Nginx config (add proxy to localhost:3000)

```bash
# Certbot should have modified the config. Verify and add the proxy pass if needed.
cat > /etc/nginx/sites-available/hr-ats.nuanu.site <<'NGINX'
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name hr-ats.nuanu.site www.hr-ats.nuanu.site;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hr-ats.nuanu.site www.hr-ats.nuanu.site;

    ssl_certificate     /etc/letsencrypt/live/hr-ats.nuanu.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hr-ats.nuanu.site/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;

        # Large file uploads (CV/resume PDFs)
        client_max_body_size 20M;
    }

    # Static assets — serve directly for better performance
    location /_next/static {
        proxy_pass http://127.0.0.1:3000/_next/static;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3000/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINX

nginx -t && systemctl reload nginx
```

---

## 7. VERIFICATION

```bash
# ── PM2 status ──
pm2 status
pm2 logs nuanu-hr --lines 30 --nostream

# ── Local curl test ──
curl -I http://127.0.0.1:3000

# ── Public curl test ──
curl -I https://hr-ats.nuanu.site

# ── Check SSL details ──
echo | openssl s_client -connect hr-ats.nuanu.site:443 -servername hr-ats.nuanu.site 2>/dev/null | openssl x509 -noout -dates -subject

# ── Check app is serving pages ──
curl -s https://hr-ats.nuanu.site | head -30
curl -s https://hr-ats.nuanu.site/login | head -30

# ── Check API health ──
curl -s https://hr-ats.nuanu.site/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"test"}' | head -5

# ── Re-check DB row counts match old server (from Stage 3d) ──
```

---

## 8. CUTOVER — Safely wind down old server

```bash
# ⚠️ ONLY AFTER all Stage 7 verification passes

# ── On OLD SERVER (10.1.4.244): Stop the Next.js app ──
# (DO NOT drop the database — keep it as backup)
pm2 stop nuanu-hr        # or whatever the PM2 name is on the old server
pm2 delete nuanu-hr
# OR if running via systemd / nohup, find and kill the process:
# systemctl stop nuanu-hr
# pkill -f "next start"

# ── On OLD SERVER: Optionally stop Nginx to avoid confusion ──
systemctl stop nginx
# systemctl disable nginx   # only if you're sure

# ── On OLD SERVER: Verify PostgreSQL is still running (keep as backup) ──
systemctl status postgresql

# ── Update A record if needed (should already point to 168.144.36.41) ──
# hr-ats.nuanu.site → 168.144.36.41
# www.hr-ats.nuanu.site → 168.144.36.41
dig +short hr-ats.nuanu.site
# Should return 168.144.36.41

# ── Final public verification from your LOCAL machine ──
curl -I https://hr-ats.nuanu.site
```

> **Post-cutover sanity checklist:**
> - ✅ Login works
> - ✅ Candidates list loads with correct data
> - ✅ Creating/editing a candidate works
> - ✅ Pipeline drag-and-drop works
> - ✅ Email notifications send (if configured)
> - ✅ CV upload works
> - ✅ Old server DB is intact (backup kept)

---

## 9. DEPLOY.SH — Future update script

Create on the droplet at `~/Nuanu_HR_Recruitment_ATS/deploy.sh`:

```bash
cat > ~/Nuanu_HR_Recruitment_ATS/deploy.sh <<'SCRIPT'
#!/bin/bash
set -e

cd ~/Nuanu_HR_Recruitment_ATS

echo "=== Pulling latest code ==="
git pull origin main 2>/dev/null || echo "[warn] Not a git repo or pull failed — skipping"

echo "=== Installing dependencies ==="
npm install --production

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Checking Prisma migration status ==="
npx prisma migrate status || echo "[warn] migrate status failed — check manually"

echo "=== Building Next.js ==="
npm run build

echo "=== Restarting PM2 ==="
pm2 restart nuanu-hr

echo "=== Done! ==="
pm2 status
SCRIPT

chmod +x ~/Nuanu_HR_Recruitment_ATS/deploy.sh

echo "Deploy script created at ~/Nuanu_HR_Recruitment_ATS/deploy.sh"
echo "Run it anytime with: ~/Nuanu_HR_Recruitment_ATS/deploy.sh"
```

---

## APPENDIX A: All process.env Variables Referenced in Codebase

> Found via exhaustive search of all `.ts` and `.tsx` files. Fill in every one that applies to your production setup in `.env`.

| Variable | Required? | Used In |
|---|---|---|
| `DATABASE_URL` | **YES** | `prisma/schema.prisma` |
| `DIRECT_URL` | **YES** | `prisma/schema.prisma` |
| `JWT_SECRET` | **YES** | `src/lib/auth.ts`, `src/middleware.ts` |
| `NEXT_PUBLIC_APP_URL` | **YES** | Login, forgot-password, apply, assessment, offers, resume-storage, reference-check-share, telegram, calendar |
| `NEXT_PUBLIC_APP_NAME` | Recommended | Offers, assessment, reference-checks, candidates |
| `NODE_ENV` | **YES** | `src/lib/prisma.ts`, `src/app/api/cron/sync-sheets/route.ts` |
| `SEEK_IMPORT_KEY` | If using SEEK | `src/app/api/candidates/import-seek/route.ts` |
| `BREVO_API_KEY` | Email (one of) | `src/lib/email.ts` |
| `BREVO_SENDER_EMAIL` | Email | `src/lib/email.ts` |
| `BREVO_SENDER_NAME` | Email | `src/lib/email.ts` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email (one of) | `src/lib/email.ts` |
| `GMAIL_USER/GMAIL_APP_PASSWORD` | Email (one of) | `src/lib/email.ts` |
| `RESEND_API_KEY/RESEND_FROM` | Email (one of) | `src/lib/email.ts` |
| `AI_API_KEY` | AI scoring | `src/lib/cv-parser.ts`, `src/app/actions/settings.ts`, `src/app/dashboard/ai-scoring/actions.ts` |
| `AI_API_URL` | AI scoring | `src/app/actions/settings.ts`, `src/app/dashboard/ai-scoring/actions.ts` |
| `AI_MODEL` | AI scoring | `src/lib/cv-parser.ts`, `src/app/actions/settings.ts`, `src/app/dashboard/ai-scoring/actions.ts` |
| `OLLAMA_URL` | AI scoring | `src/lib/cv-parser.ts` |
| `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` | Calendar | `src/lib/google-calendar.ts` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets sync | `src/lib/integrations/google-sheets.ts` |
| `TRACKING_SPREADSHEET_ID` | Sheets sync | `src/app/api/cron/sync-sheets/route.ts` |
| `CRON_SECRET` | Sheets sync | `src/app/api/cron/sync-sheets/route.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | `src/lib/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | `src/lib/supabase.ts` |
| `TELEGRAM_BOT_TOKEN` | Telegram | `src/lib/telegram.ts` |
| `JOBSTREET_WEBHOOK_SECRET` | JobStreet | `src/app/api/webhooks/jobstreet/route.ts` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io | `src/lib/socket.ts` |
| `SEEK_AUTO_CREATE_VACANCIES` | SEEK (optional) | `src/app/api/candidates/import-seek/route.ts` |
| `SEEK_VACANCY_SITE_MANAGER` | SEEK (optional) | `src/app/api/candidates/import-seek/route.ts` |
| `SEEK_VACANCY_ACCOUNTING_OFFICER` | SEEK (optional) | `src/app/api/candidates/import-seek/route.ts` |
| `SEEK_VACANCY_SAFETY_OFFICER` | SEEK (optional) | `src/app/api/candidates/import-seek/route.ts` |
| `SEEK_CHECKPOINT_PATH` | SEEK (optional) | `src/app/api/seek/salary/route.ts` |

---

## APPENDIX B: Quick Troubleshooting

| Symptom | Check |
|---|---|
| 502 Bad Gateway | `pm2 status` — is nuanu-hr online? `pm2 logs nuanu-hr` for errors |
| Database connection refused | `systemctl status postgresql`, check `pg_hba.conf` |
| Prisma Client not found | `cd ~/Nuanu_HR_Recruitment_ATS && npx prisma generate` |
| Build fails on `scripts/migrate.ts` | The restore DB already has tables; this script may be harmless but check `scripts/migrate.ts` content |
| SSL cert expired | `certbot renew --dry-run` then `certbot renew` |
| Port 3000 not listening | `pm2 restart nuanu-hr && ss -tlnp \| grep 3000` |
| Uploads broken | Ensure `public/uploads/resumes/` directory exists and is writable |