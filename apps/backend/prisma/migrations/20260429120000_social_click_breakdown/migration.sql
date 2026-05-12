-- AlterTable
ALTER TABLE "professional_professions" ADD COLUMN "social_click_instagram_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "professional_professions" ADD COLUMN "social_click_tiktok_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "professional_professions" ADD COLUMN "social_click_other_count" INTEGER NOT NULL DEFAULT 0;

-- Legacy aggregate taps had no per-platform split — attribute them to "other" so totals stay consistent.
UPDATE "professional_professions"
SET "social_click_other_count" = "social_click_count"
WHERE "social_click_count" > 0;
