This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## SEEK Employer import

External scraper (runs locally, not on Vercel) POSTs candidates to `/api/candidates/import-seek` with header `x-api-key`.

When a SEEK role (e.g. **Site Manager**, **Accounting Officer**) has no matching ATS vacancy, the API **auto-creates** a published job with that title (`SEEK_AUTO_CREATE_VACANCIES=true` by default).

Resumes from the scraper are sent as base64 in the import payload and uploaded to **Supabase Storage** (`resumes` bucket). On Vercel, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these, candidates import but CVs show “No Resume on File” in the dashboard.

1. Copy `.env.example` to `.env` and set `SEEK_IMPORT_KEY` (see example value in `.env.example`). Set the same value as `SEEK_IMPORT_KEY` on Vercel.
2. Add the same variable in Vercel → Project → Settings → Environment Variables.
3. Run the companion `seek-scraper` project (sibling folder) with matching `NUANU_API_KEY`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
