-- Per-profession business / salon / bio / social (was duplicated on professional_profiles).
ALTER TABLE "professional_professions" ADD COLUMN "business_name" TEXT;
ALTER TABLE "professional_professions" ADD COLUMN "business_number" TEXT;
ALTER TABLE "professional_professions" ADD COLUMN "business_address" TEXT;
ALTER TABLE "professional_professions" ADD COLUMN "about_me" TEXT;
ALTER TABLE "professional_professions" ADD COLUMN "social_media" TEXT;
ALTER TABLE "professional_professions" ADD COLUMN "booking_site" TEXT;

-- Copy existing profile-level values onto every linked profession row (same data as before for each).
UPDATE "professional_professions" AS pp
SET
  "business_name" = pr."business_name",
  "business_number" = pr."business_number",
  "business_address" = pr."business_address",
  "about_me" = pr."about_me",
  "social_media" = pr."social_media",
  "booking_site" = pr."booking_site"
FROM "professional_profiles" AS pr
WHERE pr."id" = pp."professional_profile_id";

ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "business_name";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "business_number";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "business_address";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "about_me";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "social_media";
ALTER TABLE "professional_profiles" DROP COLUMN IF EXISTS "booking_site";
