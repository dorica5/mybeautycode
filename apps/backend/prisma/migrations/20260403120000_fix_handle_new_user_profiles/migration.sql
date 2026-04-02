-- handle_new_user (Supabase auth.users trigger) must match profiles columns after full_name removal.
-- Old versions inserted (id, full_name, avatar_url) and fail once full_name column is dropped.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  raw_name text;
  first_n text;
  last_n text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  raw_name := NULLIF(trim(COALESCE(meta->>'full_name', meta->>'name', '')), '');

  IF raw_name IS NOT NULL THEN
    first_n := NULLIF(trim(split_part(raw_name, ' ', 1)), '');
    last_n := NULLIF(trim(regexp_replace(raw_name, '^\S+\s*', '')), '');
    IF last_n = '' THEN
      last_n := NULL;
    END IF;
  ELSE
    first_n := NULL;
    last_n := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, signup_date)
  VALUES (
    NEW.id,
    NEW.email,
    first_n,
    last_n,
    NULLIF(trim(meta->>'avatar_url'), ''),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
