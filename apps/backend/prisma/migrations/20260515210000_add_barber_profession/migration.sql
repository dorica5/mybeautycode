-- Adds the `barber` profession lane. Lane isolation is already enforced via
-- profession_id on professional_professions, client_professional_links,
-- service_records, public_profile_work_images, inspirations, etc., so inserting
-- the row is sufficient — no data backfill or relinking is required.
INSERT INTO "professions" ("code", "sort_order")
VALUES ('barber', 5)
ON CONFLICT ("code") DO UPDATE SET
  "sort_order" = EXCLUDED."sort_order";
