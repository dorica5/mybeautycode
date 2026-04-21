-- =============================================================================
-- Cascade auth.users -> profiles, and preserve client visit history when a
-- professional is deleted.
-- =============================================================================

-- 1) Link profiles.id to auth.users(id) with ON DELETE CASCADE so deleting a
--    Supabase auth user automatically wipes their profile (and everything below,
--    via the cascades already defined on profiles).
ALTER TABLE "public"."profiles"
  DROP CONSTRAINT IF EXISTS "profiles_id_fkey";

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id")
  REFERENCES "auth"."users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 2) When a professional is deleted, keep the client's service_records but
--    null out the professional reference (the visit still belongs to the client).
ALTER TABLE "public"."service_records"
  ALTER COLUMN "professional_profile_id" DROP NOT NULL;

ALTER TABLE "public"."service_records"
  DROP CONSTRAINT IF EXISTS "service_records_professional_profile_id_fkey";

ALTER TABLE "public"."service_records"
  ADD CONSTRAINT "service_records_professional_profile_id_fkey"
  FOREIGN KEY ("professional_profile_id")
  REFERENCES "public"."professional_profiles"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
