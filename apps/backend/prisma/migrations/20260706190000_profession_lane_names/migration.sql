-- Hair (primary) lane keeps the legacy shared pro name; other lanes stay client-seeded.
UPDATE "professional_professions" pp
SET
  "first_name" = prof."first_name",
  "last_name" = prof."last_name",
  "display_name" = prof."display_name",
  "updated_at" = NOW()
FROM "professional_profiles" prof
JOIN "professions" pr ON pr."id" = pp."profession_id"
WHERE pp."professional_profile_id" = prof."id"
  AND pr."code" = 'hair'
  AND (
    prof."first_name" IS NOT NULL
    OR prof."last_name" IS NOT NULL
    OR prof."display_name" IS NOT NULL
  )
  AND (
    SELECT COUNT(*)::int
    FROM "professional_professions" pp2
    WHERE pp2."professional_profile_id" = prof."id"
  ) > 1;

-- Non-hair lanes on multi-account pros: client legal name only (never copy hair lane).
UPDATE "professional_professions" pp
SET
  "first_name" = NULLIF(TRIM(p."first_name"), ''),
  "last_name" = NULLIF(TRIM(p."last_name"), ''),
  "display_name" = NULLIF(
    TRIM(CONCAT_WS(' ', NULLIF(TRIM(p."first_name"), ''), NULLIF(TRIM(p."last_name"), ''))),
    ''
  ),
  "updated_at" = NOW()
FROM "professional_profiles" prof
JOIN "profiles" p ON p."id" = prof."profile_id"
JOIN "professions" pr ON pr."id" = pp."profession_id"
WHERE pp."professional_profile_id" = prof."id"
  AND pr."code" <> 'hair'
  AND (
    SELECT COUNT(*)::int
    FROM "professional_professions" pp2
    WHERE pp2."professional_profile_id" = prof."id"
  ) > 1
  AND (
    NULLIF(TRIM(p."first_name"), '') IS NOT NULL
    OR NULLIF(TRIM(p."last_name"), '') IS NOT NULL
  );
