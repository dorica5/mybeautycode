# Supabase SQL Migrations for MyBeautyCode

These SQL snippets should be applied **after** Prisma migrations create the base schema. They add Postgres-specific logic that Prisma cannot represent: triggers, functions, RLS policies, and auth integration.

---

## 1. Updated_at Trigger Function

Use a single reusable function for all tables with `updated_at`:

```sql
-- Migration: 001_updated_at_trigger.sql
-- Run AFTER Prisma migration creates tables

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Attach updated_at Triggers to Relevant Tables

```sql
-- Migration: 002_attach_updated_at_triggers.sql

-- profiles
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- professional_profiles
CREATE TRIGGER set_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- professional_professions
CREATE TRIGGER set_professional_professions_updated_at
  BEFORE UPDATE ON public.professional_professions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- client_professional_links
CREATE TRIGGER set_client_professional_links_updated_at
  BEFORE UPDATE ON public.client_professional_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- client_profession_profiles
CREATE TRIGGER set_client_profession_profiles_updated_at
  BEFORE UPDATE ON public.client_profession_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- service_records
CREATE TRIGGER set_service_records_updated_at
  BEFORE UPDATE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- inspirations
CREATE TRIGGER set_inspirations_updated_at
  BEFORE UPDATE ON public.inspirations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_strikes
CREATE TRIGGER set_user_strikes_updated_at
  BEFORE UPDATE ON public.user_strikes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- reported_users
CREATE TRIGGER set_reported_users_updated_at
  BEFORE UPDATE ON public.reported_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- support_tickets
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- push_tokens
CREATE TRIGGER set_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 3. Auth.users → profiles Creation Trigger

Creates a profile when a new user signs up via Supabase Auth:

```sql
-- Migration: 003_auth_profiles_trigger.sql
-- Requires: auth.users table (Supabase Auth)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, signup_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Note:** Supabase triggers on `auth.users` require appropriate permissions. If the trigger cannot be created (e.g. in hosted Supabase), use a Supabase Edge Function or application-level hook to create profiles on signup.

**Note on `profiles.id`:** Ensure `profiles.id` matches `auth.users.id` (UUID). The trigger uses `NEW.id` from `auth.users`.

---

## 4. Audit Log Trigger Function (Optional but Recommended)

Logs structural changes (create/update/delete) to sensitive tables via DB trigger. Use for tables where you want **guaranteed** audit coverage regardless of application code paths.

```sql
-- Migration: 004_audit_log_trigger.sql

-- Function to log changes to audit_logs
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id uuid;
  v_action text;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Resolve actor: prefer current_setting from app, fallback to auth.uid()
  BEGIN
    v_actor_id := COALESCE(
      (current_setting('app.current_user_id', true))::uuid,
      auth.uid()
    );
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := auth.uid();
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_type,
    action,
    entity_table,
    entity_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    v_actor_id,
    'user',
    v_action::audit_action,
    TG_TABLE_NAME,
    COALESCE(
      (NEW.id)::uuid,
      (OLD.id)::uuid
    ),
    v_old_data,
    v_new_data,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Attach to selected tables** (avoid high-churn tables to limit volume):

```sql
-- Example: audit client_professional_links
CREATE TRIGGER audit_client_professional_links
  AFTER INSERT OR UPDATE OR DELETE ON public.client_professional_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Example: audit client_profession_profiles (baseline data)
CREATE TRIGGER audit_client_profession_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.client_profession_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Example: audit service_records
CREATE TRIGGER audit_service_records
  AFTER INSERT OR UPDATE OR DELETE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

**Application-level logging:** For actions like `share`, `link`, `unlink`, `status_change`, log from the application using `audit_logs` or `activity_logs`. Set `app.current_user_id` in a transaction if needed:

```sql
-- In app, before sensitive operation:
SELECT set_config('app.current_user_id', 'user-uuid-here', true);
```

---

## 5. RLS Policies (Health-Data-Level Security)

Enable RLS on **all** tables. Default deny; explicit allow only. Supabase uses `auth.uid()` for the current user. No anonymous access.

**Security principles:**
- No `USING (true)` for sensitive data; require `auth.uid()` or `is_admin()`
- Principle of least privilege: grant only the minimum needed
- Audit logs: append-only via triggers/service_role; read by admins only
- Admin operations: gated by `is_admin()`; admin list in `admin_users` (service_role only)

### Admin Role Helper

Create a helper to identify admins. Run this **before** the main RLS migration.

```sql
-- Migration: 005a_admin_helper.sql
-- Run BEFORE 005_rls_policies.sql

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Grant table access (RLS will restrict reads)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Populate admin_users via service_role or superuser, e.g.:
-- INSERT INTO public.admin_users (user_id) VALUES ('admin-profile-uuid');
```

### Enable RLS on All Tables

```sql
-- Migration: 005_rls_policies.sql

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_professional_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profession_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_record_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
```

### profiles

```sql
-- Profile creation: only for new user (id = auth.uid()). Auth trigger uses SECURITY DEFINER.
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read any profile (for moderation/support)
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

### professional_profiles

```sql
-- Authenticated users only; no anonymous read
CREATE POLICY "professional_profiles_select_authenticated"
  ON public.professional_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "professional_profiles_insert_own"
  ON public.professional_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "professional_profiles_update_own"
  ON public.professional_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "professional_profiles_delete_own"
  ON public.professional_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);
```

### professions (lookup table)

```sql
-- Read-only for authenticated users
CREATE POLICY "professions_select_authenticated"
  ON public.professions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify professions
CREATE POLICY "professions_insert_admin"
  ON public.professions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "professions_update_admin"
  ON public.professions FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "professions_delete_admin"
  ON public.professions FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

### professional_professions

```sql
CREATE POLICY "professional_professions_select_via_profile"
  ON public.professional_professions FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      professional_profile_id IN (
        SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
      )
      OR professional_profile_id IN (
        SELECT id FROM public.professional_profiles
      )
    )
  );

CREATE POLICY "professional_professions_insert_own"
  ON public.professional_professions FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "professional_professions_update_own"
  ON public.professional_professions FOR UPDATE
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "professional_professions_delete_own"
  ON public.professional_professions FOR DELETE
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );
```

### client_professional_links

```sql
CREATE POLICY "cpl_select_client"
  ON public.client_professional_links FOR SELECT
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "cpl_select_professional"
  ON public.client_professional_links FOR SELECT
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "cpl_insert_as_client"
  ON public.client_professional_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "cpl_insert_as_professional"
  ON public.client_professional_links FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "cpl_update_client"
  ON public.client_professional_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "cpl_update_professional"
  ON public.client_professional_links FOR UPDATE
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );
```

### client_profession_profiles (sensitive baseline data)

```sql
CREATE POLICY "cpp_select_client"
  ON public.client_profession_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "cpp_select_professional"
  ON public.client_profession_profiles FOR SELECT
  TO authenticated
  USING (
    client_user_id IN (
      SELECT client_user_id FROM public.client_professional_links cpl
      JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid() AND cpl.status = 'active'
    )
  );

CREATE POLICY "cpp_insert_client"
  ON public.client_profession_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "cpp_insert_professional"
  ON public.client_profession_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    client_user_id IN (
      SELECT client_user_id FROM public.client_professional_links cpl
      JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid() AND cpl.status = 'active'
    )
  );

CREATE POLICY "cpp_update_client"
  ON public.client_profession_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "cpp_update_professional"
  ON public.client_profession_profiles FOR UPDATE
  TO authenticated
  USING (
    client_user_id IN (
      SELECT client_user_id FROM public.client_professional_links cpl
      JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid() AND cpl.status = 'active'
    )
  );

CREATE POLICY "cpp_delete_client"
  ON public.client_profession_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "cpp_delete_professional"
  ON public.client_profession_profiles FOR DELETE
  TO authenticated
  USING (
    client_user_id IN (
      SELECT client_user_id FROM public.client_professional_links cpl
      JOIN public.professional_profiles pp ON pp.id = cpl.professional_profile_id
      WHERE pp.profile_id = auth.uid() AND cpl.status = 'active'
    )
  );
```

### service_records (sensitive visit data)

```sql
CREATE POLICY "sr_select_client"
  ON public.service_records FOR SELECT
  TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "sr_select_professional"
  ON public.service_records FOR SELECT
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "sr_insert_professional"
  ON public.service_records FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "sr_update_professional"
  ON public.service_records FOR UPDATE
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "sr_delete_professional"
  ON public.service_records FOR DELETE
  TO authenticated
  USING (
    professional_profile_id IN (
      SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
    )
  );
```

### service_record_media

```sql
CREATE POLICY "srm_select_via_record"
  ON public.service_record_media FOR SELECT
  TO authenticated
  USING (
    service_record_id IN (
      SELECT id FROM public.service_records
      WHERE client_user_id = auth.uid()
      OR professional_profile_id IN (
        SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "srm_insert_via_record"
  ON public.service_record_media FOR INSERT
  TO authenticated
  WITH CHECK (
    service_record_id IN (
      SELECT id FROM public.service_records
      WHERE professional_profile_id IN (
        SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "srm_update_via_record"
  ON public.service_record_media FOR UPDATE
  TO authenticated
  USING (
    service_record_id IN (
      SELECT id FROM public.service_records
      WHERE professional_profile_id IN (
        SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "srm_delete_via_record"
  ON public.service_record_media FOR DELETE
  TO authenticated
  USING (
    service_record_id IN (
      SELECT id FROM public.service_records
      WHERE professional_profile_id IN (
        SELECT id FROM public.professional_profiles WHERE profile_id = auth.uid()
      )
    )
  );
```

### inspirations

```sql
CREATE POLICY "inspirations_select_own"
  ON public.inspirations FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "inspirations_insert_own"
  ON public.inspirations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "inspirations_update_own"
  ON public.inspirations FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "inspirations_delete_own"
  ON public.inspirations FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
```

### shared_inspirations

```sql
CREATE POLICY "si_select_sender"
  ON public.shared_inspirations FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_user_id);

CREATE POLICY "si_select_recipient"
  ON public.shared_inspirations FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "si_insert_sender"
  ON public.shared_inspirations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "si_delete_sender"
  ON public.shared_inspirations FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_user_id);
```

### notifications

```sql
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_as_sender"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id OR sender_id IS NULL);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### blocked_users

```sql
CREATE POLICY "blocked_select_blocker"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_insert_blocker"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_delete_blocker"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);
```

### user_strikes (moderation – admin + own)

```sql
CREATE POLICY "user_strikes_select_own"
  ON public.user_strikes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_strikes_select_admin"
  ON public.user_strikes FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "user_strikes_all_admin"
  ON public.user_strikes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### reported_users

```sql
CREATE POLICY "reported_select_reporter"
  ON public.reported_users FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "reported_insert_reporter"
  ON public.reported_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reported_all_admin"
  ON public.reported_users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### user_restrictions

```sql
CREATE POLICY "restrictions_select_subject"
  ON public.user_restrictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "restrictions_select_applier"
  ON public.user_restrictions FOR SELECT
  TO authenticated
  USING (auth.uid() = applied_by);

CREATE POLICY "restrictions_all_admin"
  ON public.user_restrictions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### admin_actions

```sql
CREATE POLICY "admin_actions_select_admin"
  ON public.admin_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_id);

CREATE POLICY "admin_actions_select_target"
  ON public.admin_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

CREATE POLICY "admin_actions_insert_admin"
  ON public.admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id AND public.is_admin());

CREATE POLICY "admin_actions_all_admin"
  ON public.admin_actions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### support_tickets

```sql
CREATE POLICY "support_select_own"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "support_insert_own"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_update_own"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "support_select_admin"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "support_update_admin"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin());
```

### push_tokens

```sql
CREATE POLICY "push_tokens_all_own"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### audit_logs (append via triggers/service_role only; read admin only)

```sql
-- No INSERT policy for authenticated: only SECURITY DEFINER triggers and service_role can insert.
-- App-level audit logging must use service_role or a SECURITY DEFINER function.
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No UPDATE or DELETE for audit logs (immutable)
```

### activity_logs

```sql
CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "activity_logs_select_own"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_select_admin"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No UPDATE or DELETE (append-only)
```

### admin_users (protect admin list)

```sql
-- RLS already enabled in 005a_admin_helper.sql

CREATE POLICY "admin_users_select_admin"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies: only service_role or superuser can manage admin list
```

---

## 6. Seed Professions Lookup

```sql
-- Migration: 006_seed_professions.sql
-- Run after Prisma migration

INSERT INTO public.professions (id, code, name, description, sort_order) VALUES
  (gen_random_uuid(), 'hair', 'Hair', 'Hair styling and coloring', 1),
  (gen_random_uuid(), 'brows', 'Brows', 'Brow styling and tinting', 2),
  (gen_random_uuid(), 'nails', 'Nails', 'Nail care and manicure', 3),
  (gen_random_uuid(), 'esthetician', 'Esthetician', 'Skin care and facials', 4)
ON CONFLICT (code) DO NOTHING;
```

**Note:** Requires unique constraint on `professions.code` (defined in Prisma schema).

---

## Summary: What Goes Where

| Concern | Prisma | SQL Migration |
|---------|--------|---------------|
| Tables, columns, relations, indexes | ✅ | - |
| Enums | ✅ | - |
| `updated_at` auto-update | - | ✅ Trigger |
| Auth → profiles sync | - | ✅ Trigger (or Edge Function) |
| Audit logging (structural) | - | ✅ Trigger (optional) |
| RLS policies | - | ✅ |
| JSON validation | - | App layer (Zod) or optional CHECK |
| Seed data | Prisma seed or SQL | ✅ SQL |
