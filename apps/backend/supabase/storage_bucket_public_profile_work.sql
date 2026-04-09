-- =============================================================================
-- Bucket: public_profile_work (professional “My work” / portfolio uploads)
-- =============================================================================
-- This script ONLY inserts/updates storage.buckets. It does NOT alter
-- professional_profiles or any Prisma tables.
--
-- If you get errors about business_address or other columns “already exists”,
-- you ran a different file (e.g. a prisma/migrations/*.sql) — open a new query
-- and run ONLY the INSERT block below.
--
-- Without this bucket row, Supabase returns “Bucket not found” and uploads fail.
--
-- Apply: Supabase Dashboard → SQL → New query → paste ONLY this file → Run.
-- Safe to run more than once.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('public_profile_work', 'public_profile_work', false)
ON CONFLICT (id) DO UPDATE
SET public = false;
