-- =============================================================================
-- Backfill professional_professions rows so lane-scoped search (Find
-- professionals by profession) can tell what accounts each pro operates.
--
-- Prior to this, link creation (client connects with a pro) never
-- materialized a professional_professions row. If the link was later removed,
-- there was no remaining evidence of the lane, so the pro disappeared from
-- search. This migration reconstructs rows from the two remaining signals:
--   1. Existing client_professional_links  (professional_profile_id + profession_id)
--   2. Lane-specific profile tables        (professional_hair_profiles, professional_nails_profiles)
-- Going forward, relationshipService also calls ensureProfessionsForProfile on
-- link creation, so every new link materializes the lane row directly.
-- =============================================================================

INSERT INTO "public"."professional_professions" (
  "id", "professional_profile_id", "profession_id", "is_active", "created_at"
)
SELECT
  gen_random_uuid(),
  l."professional_profile_id",
  l."profession_id",
  TRUE,
  NOW()
FROM "public"."client_professional_links" l
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."professional_professions" pp
  WHERE pp."professional_profile_id" = l."professional_profile_id"
    AND pp."profession_id"           = l."profession_id"
)
GROUP BY l."professional_profile_id", l."profession_id"
ON CONFLICT ("professional_profile_id", "profession_id") DO NOTHING;

-- Hair: any pro with a hair-specific profile row must have the hair lane.
INSERT INTO "public"."professional_professions" (
  "id", "professional_profile_id", "profession_id", "is_active", "created_at"
)
SELECT
  gen_random_uuid(),
  h."professional_profile_id",
  (SELECT id FROM "public"."professions" WHERE code = 'hair' LIMIT 1),
  TRUE,
  NOW()
FROM "public"."professional_hair_profiles" h
WHERE (SELECT id FROM "public"."professions" WHERE code = 'hair' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."professional_professions" pp
    WHERE pp."professional_profile_id" = h."professional_profile_id"
      AND pp."profession_id"           = (SELECT id FROM "public"."professions" WHERE code = 'hair' LIMIT 1)
  )
ON CONFLICT ("professional_profile_id", "profession_id") DO NOTHING;

-- Nails: same logic for the nails-specific profile table.
INSERT INTO "public"."professional_professions" (
  "id", "professional_profile_id", "profession_id", "is_active", "created_at"
)
SELECT
  gen_random_uuid(),
  n."professional_profile_id",
  (SELECT id FROM "public"."professions" WHERE code = 'nails' LIMIT 1),
  TRUE,
  NOW()
FROM "public"."professional_nails_profiles" n
WHERE (SELECT id FROM "public"."professions" WHERE code = 'nails' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "public"."professional_professions" pp
    WHERE pp."professional_profile_id" = n."professional_profile_id"
      AND pp."profession_id"           = (SELECT id FROM "public"."professions" WHERE code = 'nails' LIMIT 1)
  )
ON CONFLICT ("professional_profile_id", "profession_id") DO NOTHING;
