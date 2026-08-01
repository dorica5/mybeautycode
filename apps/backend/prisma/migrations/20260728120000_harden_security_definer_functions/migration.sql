-- Harden DB helper functions flagged by Supabase Advisors:
-- 1) Pin search_path on SECURITY DEFINER / trigger helpers
-- 2) Revoke anon/authenticated EXECUTE on trigger-only helpers (still run via triggers)
--
-- IMPORTANT: public.is_admin() MUST stay executable by authenticated —
-- RLS policies call it. Anon must not be able to RPC it.

DO $$
BEGIN
  -- set_updated_at (BEFORE UPDATE trigger helper)
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_updated_at() SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_updated_at() TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role';
  END IF;

  -- audit_trigger_func (AFTER INSERT/UPDATE/DELETE audit helper)
  IF to_regprocedure('public.audit_trigger_func()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.audit_trigger_func() SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO service_role';
  END IF;

  -- handle_new_user (auth.users → profiles trigger)
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role';
  END IF;

  -- is_admin (RLS helper — keep authenticated EXECUTE, revoke anon)
  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_admin() FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role';
  END IF;
END
$$;
