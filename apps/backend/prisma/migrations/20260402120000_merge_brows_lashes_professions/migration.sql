-- Combine legacy `brows` + `lashes` rows into `brows_lashes` where they still exist.

INSERT INTO "professions" ("code", "sort_order")
VALUES ('brows_lashes', 2)
ON CONFLICT ("code") DO UPDATE SET "sort_order" = EXCLUDED."sort_order";

DELETE FROM "professional_professions" AS a
USING "professional_professions" AS b,
  "professions" AS oldp,
  "professions" AS newp
WHERE a."profession_id" = oldp."id"
  AND oldp."code" IN ('brows', 'lashes')
  AND newp."code" = 'brows_lashes'
  AND b."professional_profile_id" = a."professional_profile_id"
  AND b."profession_id" = newp."id";

UPDATE "professional_professions"
SET "profession_id" = (SELECT "id" FROM "professions" WHERE "code" = 'brows_lashes' LIMIT 1)
WHERE "profession_id" IN (SELECT "id" FROM "professions" WHERE "code" IN ('brows', 'lashes'));

DELETE FROM "client_profession_profiles" AS a
USING "client_profession_profiles" AS b,
  "professions" AS oldp,
  "professions" AS newp
WHERE a."profession_id" = oldp."id"
  AND oldp."code" IN ('brows', 'lashes')
  AND newp."code" = 'brows_lashes'
  AND b."client_user_id" = a."client_user_id"
  AND b."profession_id" = newp."id";

UPDATE "client_profession_profiles"
SET "profession_id" = (SELECT "id" FROM "professions" WHERE "code" = 'brows_lashes' LIMIT 1)
WHERE "profession_id" IN (SELECT "id" FROM "professions" WHERE "code" IN ('brows', 'lashes'));

UPDATE "inspirations"
SET "profession_id" = (SELECT "id" FROM "professions" WHERE "code" = 'brows_lashes' LIMIT 1)
WHERE "profession_id" IN (SELECT "id" FROM "professions" WHERE "code" IN ('brows', 'lashes'));

UPDATE "shared_inspirations"
SET "profession_id" = (SELECT "id" FROM "professions" WHERE "code" = 'brows_lashes' LIMIT 1)
WHERE "profession_id" IN (SELECT "id" FROM "professions" WHERE "code" IN ('brows', 'lashes'));

UPDATE "service_records"
SET "profession_id" = (SELECT "id" FROM "professions" WHERE "code" = 'brows_lashes' LIMIT 1)
WHERE "profession_id" IN (SELECT "id" FROM "professions" WHERE "code" IN ('brows', 'lashes'));

DELETE FROM "professions" WHERE "code" IN ('brows', 'lashes');

UPDATE "professions" SET "sort_order" = 3 WHERE "code" = 'nails';
UPDATE "professions" SET "sort_order" = 4 WHERE "code" = 'esthetician';
