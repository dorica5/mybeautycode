-- Separate consumer “My inspiration” bucket from pro hair/nails/brows when the same login uses client + professional surfaces.
INSERT INTO "professions" ("code", "sort_order")
VALUES ('client', 0)
ON CONFLICT ("code") DO UPDATE SET
  "sort_order" = EXCLUDED."sort_order";
