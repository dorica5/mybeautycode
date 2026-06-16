-- Per-profession profile photo override (falls back to profiles.avatar_url when null).

ALTER TABLE "professional_professions"
ADD COLUMN "avatar_url" TEXT;
