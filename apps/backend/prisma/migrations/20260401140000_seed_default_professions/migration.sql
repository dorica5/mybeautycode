-- Reference data required by inspiration APIs (default profession code "hair").
INSERT INTO "professions" ("code", "sort_order")
VALUES
  ('hair', 1),
  ('brows', 2),
  ('lashes', 3),
  ('nails', 4),
  ('esthetician', 5)
ON CONFLICT ("code") DO UPDATE SET
  "sort_order" = EXCLUDED."sort_order";
