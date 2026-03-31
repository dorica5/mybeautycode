-- Split full_name into first_name / last_name; add country and about_me on profiles.
-- Run via: npx prisma migrate deploy (or paste into Supabase SQL on a DB that still has full_name).

ALTER TABLE "profiles" ADD COLUMN "first_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "last_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "country" TEXT;
ALTER TABLE "profiles" ADD COLUMN "about_me" TEXT;

UPDATE "profiles"
SET
  "first_name" = CASE
    WHEN "full_name" IS NULL OR btrim("full_name") = '' THEN NULL
    ELSE NULLIF(btrim(split_part(btrim("full_name"), ' ', 1)), '')
  END,
  "last_name" = CASE
    WHEN "full_name" IS NULL OR btrim("full_name") = '' THEN NULL
    ELSE NULLIF(
      btrim(regexp_replace(btrim("full_name"), '^\S+\s*', '')),
      ''
    )
  END;

ALTER TABLE "profiles" DROP COLUMN "full_name";

-- If Supabase `handle_new_user` (or similar) still inserts `full_name`, update it to set
-- `first_name` / `last_name` (and drop `full_name`) so new signups match this schema.
