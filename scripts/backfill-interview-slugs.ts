/**
 * Backfill interviewSlug for candidates that don't have one yet.
 * Safe to re-run: skips rows where the slug is already set.
 *
 * Run:    npx tsx scripts/backfill-interview-slugs.ts
 *   or:   npm run db:backfill:interview-slugs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugifyName(raw: string | null | undefined): string {
  const base = (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "candidate";
}

function shortSuffix(id: string): string {
  const clean = (id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (clean || "0000").slice(0, 4);
}

function randomTail(): string {
  return Math.random().toString(36).slice(2, 6);
}

async function generateSlug(
  name: string | null | undefined,
  id: string,
): Promise<string> {
  const base = slugifyName(name);
  const tail = shortSuffix(id);
  const candidates = [base, `${base}-${tail}`, `${base}-${randomTail()}`];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const clash = await prisma.user.findFirst({
      where: { interviewSlug: candidate, NOT: { id } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${base}-${id.slice(0, 4).toLowerCase()}-${randomTail()}`;
}

async function main() {
  const where = {
    applications: { some: {} }, // only users that actually have an application
    interviewSlug: null,
  };

  const total = await prisma.user.count({ where });
  console.log(`[backfill] Candidates missing interviewSlug: ${total}`);

  const cursor: { id: string; name: string }[] = await prisma.user.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of cursor) {
    try {
      const slug = await generateSlug(u.name, u.id);
      const res = await prisma.user.updateMany({
        where: { id: u.id, interviewSlug: null },
        data: { interviewSlug: slug },
      });
      if (res.count === 1) updated += 1;
      else skipped += 1;
      if ((updated + skipped) % 25 === 0) {
        console.log(
          `[backfill] progress: updated=${updated} skipped=${skipped} failed=${failed}`,
        );
      }
    } catch (err) {
      failed += 1;
      console.warn(`[backfill] failed for user ${u.id} (${u.name}):`, err);
    }
  }

  console.log(
    `[backfill] Done. updated=${updated} skipped=${skipped} failed=${failed}`,
  );
}

main()
  .catch((e) => {
    console.error("[backfill] Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
