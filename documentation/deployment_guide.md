# 🚀 Nuanu ATS: Online Deployment Guide

Follow these steps to move your application from your laptop to the cloud (Vercel + Supabase + Groq).

## 1. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to **Project Settings > Database**.
3. Copy the **Transaction Connection String** (usually ends with `:6543/postgres?pgbouncer=true`).
4. Keep this ready for the Vercel setup.

## 2. AI Setup (Groq)
1. Go to [Groq Console](https://console.groq.com/keys).
2. Create a new API Key.
3. This will allow your app to run scans 24/7 without your laptop.

## 3. Vercel Deployment
1. Push your code to a GitHub repository.
2. Connect the repository to [Vercel](https://vercel.com).
3. In the **Environment Variables** section, add the following:

| Key | Value (Example) |
| :--- | :--- |
| `DATABASE_URL` | *Your Supabase Connection String* |
| `DIRECT_URL` | *Your Supabase Direct Connection String* |
| `JWT_SECRET` | *A random long string* |
| `AI_API_URL` | `https://api.groq.com/openai/v1/chat/completions` |
| `AI_API_KEY` | *Your Groq API Key* |
| `AI_MODEL` | `qwen-2.5-32b` |
| `RESEND_API_KEY` | *Your Resend Key* |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.vercel.app` |

## 4. Final Database Sync
Once the environment variables are set in Vercel, run this command **on your laptop** one last time to sync the schema to the cloud:
```bash
DATABASE_URL="your_supabase_url_here" npx prisma db push
```

## 5. Verification
1. Visit your Vercel URL.
2. Log in.
3. Go to **Settings > AI Status**. It should show **Groq** as the provider!
