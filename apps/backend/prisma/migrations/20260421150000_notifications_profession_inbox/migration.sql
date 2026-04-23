-- =============================================================================
-- Scope notifications by "inbox" so multi-role pros only see a notification in
-- the profession account it was sent to:
--   * profession_code IS NULL  -> client inbox
--   * profession_code = 'hair' -> pro's hair account inbox
--   * profession_code = 'nails'-> pro's nails account inbox
--   * profession_code = 'brows'-> pro's brows account inbox
--
-- Existing rows are left NULL, which puts legacy notifications in the client
-- inbox. That matches current behavior where pros had no per-lane inbox.
-- =============================================================================

ALTER TABLE "public"."notifications"
  ADD COLUMN IF NOT EXISTS "profession_code" TEXT;

CREATE INDEX IF NOT EXISTS "notifications_user_id_profession_code_idx"
  ON "public"."notifications" ("user_id", "profession_code");
