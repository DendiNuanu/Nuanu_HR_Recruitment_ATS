/**
 * One-off fix script — corrects the Nur Islami Ulil Albab candidate record.
 *
 * Bug history:
 *   - The SEEK list page (your-candidates) renders several rows that all
 *     share the same phone number (+62 85211297243), one per application
 *     submitted by users of a shared device or, more likely, a SEEK list
 *     rendering quirk.
 *   - The scraper (older version) merged all SEEK network responses into a
 *     single candidate object, so every row with that phone inherited the
 *     same email and location. Several candidates (Nur Islami, Muhammad
 *     Frengki, Bintang Oria Ritonga, …) ended up with email
 *     `aardyadarma@gmail.com` even though their actual SEEK profile shows
 *     different emails.
 *   - Additionally, location was never extracted from the SEEK profile tab.
 *
 * This script:
 *   1. Locates the User row that has email `hidayatgorat@gmail.com` and
 *      name "Nur Islami Ulil Albab" and a CandidateProfile whose
 *      seekProfileId matches the SEEK UUID for Nur Islami.
 *   2. Updates the User.email to the real SEEK email
 *      (`nurislamiulilalbab@gmail.com`).
 *   3. Updates the User.phone to the phone shown on the SEEK profile
 *      (`+6285852518261`).
 *   4. Sets CandidateProfile.location / domicile / locationSeek to
 *      "Malang, East Java" and updates emailSeek.
 *
 * Run with: `npx tsx scripts/fix-nur-islami.ts`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEEK_PROFILE_ID = "d5f7ee3a-6f63-4e26-b9c5-39af0804eb8b";
const CORRECT_EMAIL = "nurislamiulilalbab@gmail.com";
const CORRECT_PHONE = "+6285852518261";
const CORRECT_LOCATION = "Malang, East Java";
const WRONG_EMAIL = "hidayatgorat@gmail.com";

async function main() {
  console.log("[fix-nur-islami] Searching for candidate with wrong email…");

  // 1) Find the CandidateProfile that already stores the SEEK profile id.
  //    `seekProfileId` is not declared @unique in the schema (so multiple
  //    rows could theoretically share it), so use findFirst.
  const profile = await prisma.candidateProfile.findFirst({
    where: { seekProfileId: SEEK_PROFILE_ID },
    select: {
      userId: true,
      seekProfileId: true,
      location: true,
      domicile: true,
      locationSeek: true,
      emailSeek: true,
    },
  });

  if (!profile) {
    console.error(
      `[fix-nur-islami] No CandidateProfile found with seekProfileId=${SEEK_PROFILE_ID}. Aborting.`,
    );
    return;
  }
  console.log("[fix-nur-islami] Found CandidateProfile:", profile);

  // 2) Fetch the user behind that profile.
  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      deletedAt: true,
    },
  });

  if (!user) {
    console.error(
      `[fix-nur-islami] No User found for userId=${profile.userId}. Aborting.`,
    );
    return;
  }
  if (user.deletedAt) {
    console.error(
      `[fix-nur-islami] User ${user.id} is soft-deleted (deletedAt=${user.deletedAt}). Aborting.`,
    );
    return;
  }
  console.log("[fix-nur-islami] Found User:", user);

  // Sanity check: name must be "Nur Islami Ulil Albab" (or close to it)
  if (!/nur\s+islami/i.test(user.name || "")) {
    console.warn(
      `[fix-nur-islami] User name "${user.name}" doesn't look like Nur Islami. Aborting.`,
    );
    return;
  }

  // 3) Make sure no other user already owns the target email — otherwise the
  // User.email unique constraint will block the update.
  const conflict = await prisma.user.findUnique({
    where: { email: CORRECT_EMAIL },
    select: { id: true, name: true, email: true },
  });
  if (conflict && conflict.id !== user.id) {
    console.error(
      `[fix-nur-islami] ABORT: email ${CORRECT_EMAIL} is already taken by another user:`,
      conflict,
    );
    return;
  }

  // 4) Update the User row.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: CORRECT_EMAIL,
      phone: CORRECT_PHONE,
      name: "Nur Islami Ulil Albab",
    },
  });
  console.log(
    `[fix-nur-islami] ✅ Updated User: email=${CORRECT_EMAIL} phone=${CORRECT_PHONE}`,
  );

  // 5) Update the CandidateProfile: location, domicile, locationSeek, emailSeek.
  await prisma.candidateProfile.update({
    where: { userId: user.id },
    data: {
      location: CORRECT_LOCATION,
      domicile: CORRECT_LOCATION,
      locationSeek: CORRECT_LOCATION,
      emailSeek: CORRECT_EMAIL,
      seekProfileId: SEEK_PROFILE_ID,
    },
  });
  console.log(
    `[fix-nur-islami] ✅ Updated CandidateProfile: location=${CORRECT_LOCATION}`,
  );

  // 6) Re-verify final state.
  const finalUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      phone: true,
      name: true,
    },
  });
  const finalProfile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: {
      location: true,
      domicile: true,
      locationSeek: true,
      emailSeek: true,
      seekProfileId: true,
    },
  });
  console.log("[fix-nur-islami] Final User:", finalUser);
  console.log("[fix-nur-islami] Final Profile:", finalProfile);
}

main()
  .catch((err) => {
    console.error("[fix-nur-islami] ❌ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
