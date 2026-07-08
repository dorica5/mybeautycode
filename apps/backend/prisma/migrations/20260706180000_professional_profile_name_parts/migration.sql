-- Separate professional first/last name from combined display_name.
ALTER TABLE "professional_profiles"
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name" TEXT;

-- Backfill from legacy display_name (first token / remainder).
UPDATE "professional_profiles"
SET
  "first_name" = CASE
    WHEN "display_name" IS NOT NULL AND POSITION(' ' IN TRIM("display_name")) > 0
      THEN TRIM(SPLIT_PART(TRIM("display_name"), ' ', 1))
    ELSE NULLIF(TRIM("display_name"), '')
  END,
  "last_name" = CASE
    WHEN "display_name" IS NOT NULL AND POSITION(' ' IN TRIM("display_name")) > 0
      THEN NULLIF(
        TRIM(SUBSTRING(TRIM("display_name") FROM POSITION(' ' IN TRIM("display_name")) + 1)),
        ''
      )
    ELSE NULL
  END
WHERE "display_name" IS NOT NULL
  AND TRIM("display_name") <> ''
  AND "first_name" IS NULL
  AND "last_name" IS NULL;
