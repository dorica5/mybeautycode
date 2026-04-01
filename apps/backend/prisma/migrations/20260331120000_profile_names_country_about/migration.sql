-- Split full_name into first_name / last_name; add country and about_me on profiles/idempotent for DBs already partly migrated).

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "about_me" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'full_name'
  ) THEN
    UPDATE "profiles"
    SET
      "first_name" = CASE
        WHEN "full_name" IS NULL OR btrim("full_name"::text) = '' THEN NULL
        ELSE NULLIF(btrim(split_part(btrim("full_name"::text), ' ', 1)), '')
      END,
      "last_name" = CASE
        WHEN "full_name" IS NULL OR btrim("full_name"::text) = '' THEN NULL
        ELSE NULLIF(
          btrim(regexp_replace(btrim("full_name"::text), '^\S+\s*', '')),
          ''
        )
      END;
  END IF;
END $$;

ALTER TABLE "profiles" DROP COLUMN IF EXISTS "full_name";
