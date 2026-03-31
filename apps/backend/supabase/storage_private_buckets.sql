-- =============================================================================
-- Private storage buckets + RLS (Supabase SQL editor or migration)
-- Run AFTER your backend exposes signed URLs (/api/storage/signed-url, sign-batch).
-- =============================================================================
-- Objects are read through time-limited signed URLs from your API (service role).
-- End users should NOT rely on public /storage/v1/object/public/... URLs.
-- =============================================================================

-- 1) Make buckets private (disable public CDN-style access)
UPDATE storage.buckets
SET public = false
WHERE id IN (
  'avatars',
  'inspirations',
  'haircode_images',
  'shared_inspiration_images'
);

-- 2) Inspect existing storage policies (run first if you created buckets long ago)
--    Replace policy names in section 3 with anything you see here that grants
--    broad SELECT/INSERT to anon or authenticated on these buckets.
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;

-- 3) Drop typical permissive policies (names vary by project — only run what exists)
--    Supabase templates / older projects sometimes add "public" read on a bucket.
--    Uncomment any line that matches pg_policies results above.

-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Give users access to own folder 1j3k2l" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;

-- 4) Recommended default for YOUR architecture (API + service role only)
--    - Service role bypasses RLS: backend uploads + createSignedUrl keep working.
--    - If there are NO policies allowing SELECT/INSERT/UPDATE/DELETE for
--      `anon` / `authenticated` on these buckets, clients cannot read objects
--      except via your signed URLs.
--
--    Do NOT re-add wide "USING (true)" policies for these buckets unless you
--    intentionally want direct Supabase Storage REST access from the app.

-- -----------------------------------------------------------------------------
-- OPTIONAL — only if you later use supabase.storage.from(...).upload() from the
-- mobile/web client with the user JWT (not recommended if you already proxy uploads).
-- Paths must match your backend: first folder segment = auth.uid() (see storageController).
-- Uncomment and adjust bucket list as needed.

-- CREATE POLICY "avatars_insert_own_folder_v1"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'avatars'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "avatars_update_own_folder_v1"
--   ON storage.objects FOR UPDATE TO authenticated
--   USING (
--     bucket_id = 'avatars'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "avatars_delete_own_folder_v1"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'avatars'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "inspirations_insert_own_folder_v1"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'inspirations'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "haircode_images_insert_own_folder_v1"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'haircode_images'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- CREATE POLICY "shared_inspiration_images_insert_own_folder_v1"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'shared_inspiration_images'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );

-- NOTE: Avoid adding FOR SELECT policies for authenticated users if you want
-- all reads to go through signed URLs only.
