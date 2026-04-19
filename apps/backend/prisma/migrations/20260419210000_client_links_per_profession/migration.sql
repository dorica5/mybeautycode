-- Per-profession client–professional links (separate “accounts” for brow vs nail on the same professional_profile).

-- Initial schema used CREATE UNIQUE INDEX (not a named UNIQUE CONSTRAINT), so DROP CONSTRAINT is a no-op.
-- We must drop the index or inserts cannot add a second row per (client, pro) for another profession.
DROP INDEX IF EXISTS "client_professional_links_client_user_id_professional_profi_key";

ALTER TABLE "client_professional_links" ADD COLUMN "profession_id" UUID;

-- Earliest visit’s profession for each existing link; else hair.
UPDATE "client_professional_links" cpl
SET "profession_id" = sub.prof_id
FROM (
  SELECT DISTINCT ON (cpl_inner.id)
    cpl_inner.id AS link_pk,
    sr.profession_id AS prof_id
  FROM "client_professional_links" cpl_inner
  INNER JOIN "service_records" sr
    ON sr.client_user_id = cpl_inner.client_user_id
   AND sr.professional_profile_id = cpl_inner.professional_profile_id
  ORDER BY cpl_inner.id, sr.created_at ASC
) sub
WHERE cpl.id = sub.link_pk;

UPDATE "client_professional_links"
SET "profession_id" = (SELECT id FROM "professions" WHERE code = 'hair' LIMIT 1)
WHERE "profession_id" IS NULL;

-- One link row per (client, pro, profession) that appears in service history.
INSERT INTO "client_professional_links" (
  "id",
  "client_user_id",
  "professional_profile_id",
  "profession_id",
  "status",
  "created_at",
  "created_by_user_id",
  "updated_at",
  "status_changed_at"
)
SELECT
  gen_random_uuid(),
  d.client_user_id,
  d.professional_profile_id,
  d.profession_id,
  COALESCE(
    (
      SELECT c.status
      FROM "client_professional_links" c
      WHERE c.client_user_id = d.client_user_id
        AND c.professional_profile_id = d.professional_profile_id
      ORDER BY
        CASE c.status
          WHEN 'active'::"client_professional_link_status" THEN 1
          WHEN 'pending'::"client_professional_link_status" THEN 2
          ELSE 3
        END
      LIMIT 1
    ),
    'active'::"client_professional_link_status"
  ),
  COALESCE(
    (
      SELECT c.created_at
      FROM "client_professional_links" c
      WHERE c.client_user_id = d.client_user_id
        AND c.professional_profile_id = d.professional_profile_id
      LIMIT 1
    ),
    NOW()
  ),
  (
    SELECT c.created_by_user_id
    FROM "client_professional_links" c
    WHERE c.client_user_id = d.client_user_id
      AND c.professional_profile_id = d.professional_profile_id
    LIMIT 1
  ),
  NOW(),
  (
    SELECT c.status_changed_at
    FROM "client_professional_links" c
    WHERE c.client_user_id = d.client_user_id
      AND c.professional_profile_id = d.professional_profile_id
    LIMIT 1
  )
FROM (
  SELECT DISTINCT "client_user_id", "professional_profile_id", "profession_id"
  FROM "service_records"
) d
WHERE NOT EXISTS (
  SELECT 1
  FROM "client_professional_links" e
  WHERE e.client_user_id = d.client_user_id
    AND e.professional_profile_id = d.professional_profile_id
    AND e.profession_id = d.profession_id
);

ALTER TABLE "client_professional_links" ALTER COLUMN "profession_id" SET NOT NULL;

ALTER TABLE "client_professional_links"
  ADD CONSTRAINT "client_professional_links_profession_id_fkey"
  FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "client_professional_links_client_user_id_professional_profile_id_profession_id_key"
  ON "client_professional_links"("client_user_id", "professional_profile_id", "profession_id");
