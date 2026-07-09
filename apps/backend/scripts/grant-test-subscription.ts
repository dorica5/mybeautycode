/**
 * Grants an active subscription row for one professional (QA / demo).
 * Usage (from apps/backend): npm run billing:grant-test -- <profile-uuid>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const profileId = process.argv[2]?.trim();
  if (!profileId) {
    console.error(
      "Usage: npm run billing:grant-test -- <profile-uuid>\n" +
        "The profile UUID is the professional's `profiles.id` (same as their auth user id)."
    );
    process.exit(1);
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      professionalProfile: { select: { id: true } },
    },
  });

  if (!profile?.professionalProfile) {
    console.error(
      `No professional profile found for id ${profileId}. Use a pro account's profile UUID.`
    );
    process.exit(1);
  }

  const delegate = (
    prisma as {
      professionalSubscription?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    }
  ).professionalSubscription;

  if (!delegate?.upsert) {
    console.error(
      "professional_subscriptions table is unavailable. Run prisma migrate deploy and prisma generate."
    );
    process.exit(1);
  }

  const now = new Date();
  await delegate.upsert({
    where: { profileId },
    create: {
      profileId,
      entitlementActive: true,
      entitlementExpiresAt: null,
      plan: "test_grant",
      revenueCatAppUserId: profileId,
      lastSyncedAt: now,
    },
    update: {
      entitlementActive: true,
      entitlementExpiresAt: null,
      plan: "test_grant",
      lastSyncedAt: now,
      updatedAt: now,
    },
  });

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  console.log(
    `Granted test subscription for ${name || profileId} (${profileId}).\n` +
      "Clients should see the subscriber star on map and public profile after refresh."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
