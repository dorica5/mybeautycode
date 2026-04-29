-- Per-platform tap counts (keys align with mobile SocialKind: instagram, tiktok, x, youtube, …).
ALTER TABLE "professional_professions" ADD COLUMN "social_click_counts" JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE "professional_professions"
SET "social_click_counts" = jsonb_build_object(
  'instagram', "social_click_instagram_count",
  'tiktok', "social_click_tiktok_count",
  'other', "social_click_other_count"
);

ALTER TABLE "professional_professions" DROP COLUMN "social_click_instagram_count";
ALTER TABLE "professional_professions" DROP COLUMN "social_click_tiktok_count";
ALTER TABLE "professional_professions" DROP COLUMN "social_click_other_count";
