# MyBeautyCode Database Architecture

## PART 1: ARCHITECTURE EXPLANATION

### Overview

The MyBeautyCode schema is designed as a **multi-profession beauty platform** that generalizes the legacy hair-only model. It separates identity, professional roles, client relationships, and domain-specific data into distinct layers.

### Design Principles

1. **Identity vs. Role Separation**  
   `profiles` holds only account/identity data. Professional and client roles are modeled through relationships, not flags. A user can be both a professional and a client.

2. **Generalized Baseline Data**  
   Instead of `client_hair_profiles`, `client_brow_profiles`, etc., we use a single `client_profession_profiles` table with:
   - `(client_user_id, profession_id)` unique constraint
   - `baseline_data` as JSONB for profession-specific attributes (e.g., hair thickness, brow shape)
   - `notes` and `last_updated_by_user_id` for auditability

3. **Generalized Service History**  
   `service_records` replaces `haircodes` with:
   - Links to `client_user_id`, `professional_profile_id`, `profession_id`
   - Optional `client_professional_link_id` for relationship context
   - `record_data` JSONB for visit-specific details
   - `service_record_media` replaces `haircode_media`

4. **Profession-Centric Model**  
   `professions` is a lookup table (hair, brows, lashes, nails, esthetician). `professional_professions` allows a professional to have multiple professions with `is_active` and optional `is_primary`.

5. **Relationship Model**  
   `client_professional_links` replaces `hairdresser_clients` with:
   - Status (pending, active, archived, blocked)
   - `created_by` for audit
   - Timestamps suitable for logging

### Why Generalize vs. Relational

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Baseline data (hair thickness, brow shape, etc.) | JSONB in `client_profession_profiles` | Each profession has different attributes; JSONB avoids schema churn and new tables per profession |
| Service visit details | JSONB in `service_records.record_data` | Visit structure varies by profession; flexible storage with typed access in app layer |
| Profession types | Relational `professions` table | Fixed, queryable, extensible via inserts |
| User–professional links | Relational `client_professional_links` | Strong integrity, status, audit |
| Inspirations | Relational with `profession_id` | Ownership, sharing, and profession scoping are core to queries |

### Future Clinical/Dental Expansion

The schema is prepared for a **hybrid clinical layer** without redesign:

1. **Separate Clinical Tables**  
   Future tables like `clinical_profiles`, `clinical_visits`, `clinical_documents` can reference `profiles` and optionally `professional_profiles`. They stay separate from beauty-domain tables.

2. **Profession Extensibility**  
   Add professions such as `dental_hygienist`, `dentist` to `professions`. Clinical workflows can use stricter validation and compliance rules in the app layer.

3. **Audit Trail**  
   `audit_logs` and `activity_logs` are actor-agnostic and can record both beauty and clinical actions. Future clinical tables can plug into the same audit infrastructure.

4. **No Mixing of Domains**  
   Beauty baseline data stays in `client_profession_profiles`. Clinical data would live in dedicated tables with appropriate access controls (e.g., RLS, HIPAA considerations).

---

## PART 2: PRISMA SCHEMA

See `apps/backend/prisma/schema.prisma` for the full schema.

---

## PART 3: SQL FOR SUPABASE

See `docs/SUPABASE_SQL_MIGRATIONS.md` for SQL snippets covering:

- `updated_at` trigger function and attachments
- `auth.users` → `profiles` creation trigger
- Audit log trigger (optional, for structural changes)
- RLS policies for profiles, client_professional_links, client_profession_profiles, service_records, notifications, push_tokens
- Professions seed data

---

## Migration Mapping (Old → New)

| Old Table | New Table(s) | Notes |
|-----------|--------------|-------|
| `profiles` | `profiles` | Stripped of `user_type`, `hair_*`, `salon_*`; identity only |
| `clients` | (concept) | Client = user with `client_professional_links`; no separate client table |
| `hairdressers` | `professional_profiles` | 1:1 with `profiles`; business info moved here |
| `haircodes` | `service_records` | Generalized; `record_data` holds profession-specific details |
| `haircode_media` | `service_record_media` | Linked to `service_records` |
| `hairdresser_clients` | `client_professional_links` | Added status, `created_by`, timestamps |
| `inspirations` | `inspirations` | Added `profession_id`, `owner_id` (user), image resolutions |
| `shared_inspiration` | `shared_inspirations` | UUID id, `sender_user_id`, `recipient_user_id`, `batch_id` |
| `notifications` | `notifications` | `extra_data` → `data` Json, improved structure |
| `blocked_users` | `blocked_users` | Kept, minor improvements |
| `user_strikes` | `user_strikes` | Kept, improved |
| `reported_users` | `reported_users` | Kept, improved |
| `user_restrictions` | `user_restrictions` | Kept, improved |
| `admin_actions` | `admin_actions` | Kept, added timestamps |
| `support_tickets` | `support_tickets` | Kept, improved |
| `push_tokens` | `push_tokens` | Kept; consider multi-device (one token per device) |

---

## Next Steps

1. **Apply Prisma schema**  
   Run `prisma migrate dev` to create the initial migration.

2. **Apply SQL migrations**  
   Run Supabase SQL snippets for triggers, RLS, and `auth.users` → `profiles` sync.

3. **Data migration**  
   Build scripts to map old `profiles`/`clients`/`hairdressers`/`haircodes` into the new structure. Use `professions` lookup for "hair" and populate `client_profession_profiles` and `service_records` from legacy data.

4. **Application layer**  
   - Implement JSON schemas/validation for `baseline_data` and `record_data` per profession.
   - Wire audit logging in app code for actions not covered by DB triggers.
   - Implement RLS policies and test with real Supabase auth.

5. **Testing**  
   - Test `updated_at` triggers.
   - Test audit logging for create/update/delete.
   - Test RLS for profiles, client_professional_links, service_records.

---

## Risks / Things to Watch Out For

1. **JSON validation**  
   Prisma does not validate JSON structure. Use Zod or similar in the app layer to validate `baseline_data` and `record_data` per profession. Consider Postgres CHECK constraints or triggers for critical fields if needed.

2. **Audit log volume**  
   High-traffic tables can generate many audit rows. Plan retention, partitioning, and indexing. Consider sampling or summarizing for high-frequency updates.

3. **Trigger vs. app logging**  
   Use DB triggers for `updated_at` and structural audit (table, id, action). Use app logic for business context (e.g., "client X linked to professional Y"). Avoid duplicating the same event in both.

4. **Health data separation**  
   When adding clinical/dental tables, keep them in separate schemas or with clear naming. Apply stricter RLS and audit requirements. Do not store clinical data in beauty-domain JSONB.

5. **RLS complexity**  
   Multi-role users (professional + client) require careful RLS. Test that a user can access their own client data and their professional clients’ data without cross-leakage.

6. **Push tokens**  
   Current design assumes one token per user. Consider `(user_id, device_id)` or similar for multi-device support.
