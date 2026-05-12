-- Per profession-lane public engagement counters (insights for professionals).
ALTER TABLE "professional_professions" ADD COLUMN "profile_view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "professional_professions" ADD COLUMN "booking_click_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "professional_professions" ADD COLUMN "social_click_count" INTEGER NOT NULL DEFAULT 0;
