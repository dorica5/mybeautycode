# Supabase: Migrate Production → Development

Guide to pull schema, data, auth, storage, and functions from your old (production) Supabase project and push to your new development project.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) installed
- [PostgreSQL](https://www.postgresql.org/download/) (for `psql`) – or use Supabase’s SQL Editor
- Old project: connection string + service role key
- New project: connection string + service role key

---

## 1. Database (Schema + Data)

### Pull from old project

```powershell
# Set your OLD project connection string (from Supabase Dashboard → Connect → URI)
$OLD_DB_URL = "postgresql://postgres.[OLD_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Dump schema, roles, and data
supabase db dump --db-url $OLD_DB_URL -f roles.sql --role-only
supabase db dump --db-url $OLD_DB_URL -f schema.sql
supabase db dump --db-url $OLD_DB_URL -f data.sql --use-copy --data-only
```

### Push to new project

```powershell
# Set your NEW project connection string
$NEW_DB_URL = "postgresql://postgres.[NEW_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Restore (run roles + schema first, then data)
psql $NEW_DB_URL -f roles.sql
psql $NEW_DB_URL -f schema.sql
psql $NEW_DB_URL -c "SET session_replication_role = replica" -f data.sql
```

**Note:** If you hit permission errors on `supabase_admin`, edit `schema.sql` and comment out lines with `ALTER ... OWNER TO "supabase_admin"`.

---

## 1b. Public Data Only (when auth + schema already migrated)

If auth users and schema are already in the new project, but **public table data** (profiles, clients, haircodes, etc.) was not copied, use this to migrate only public data:

### Dump public data from OLD project

```powershell
# OLD project connection string (from Supabase Dashboard → Connect → URI)
$OLD_DB_URL = "postgresql://postgres.[OLD_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Dump ONLY public schema data (no auth, no other schemas)
pg_dump $OLD_DB_URL --schema=public --data-only --no-owner --no-privileges -f public_data.sql
```

### Restore public data to NEW project

```powershell
# NEW project connection string
$NEW_DB_URL = "postgresql://postgres.[NEW_PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Restore (disables triggers/FKs temporarily so load order works)
psql $NEW_DB_URL -c "SET session_replication_role = replica" -f public_data.sql
psql $NEW_DB_URL -c "SET session_replication_role = DEFAULT"
```

**Note:** Requires `pg_dump` and `psql` (install PostgreSQL or use [Supabase CLI](https://supabase.com/docs/guides/cli) which bundles them). On Windows, ensure they're in your PATH.

---

## 2. Auth (Users + Passwords)

Auth data lives in the `auth` schema and is included in the database dump above. If you dump the full schema and data, auth users are migrated.

### JWT secret (important)

If you want existing tokens to keep working, copy the **old JWT secret** into the new project:

1. Old project: **Settings → API → JWT Secret** → copy
2. New project: **Settings → API → JWT Secret** → paste and save

**Warning:** Changing the JWT secret regenerates your anon and service_role keys in the new project. Update your `.env` files with the new keys.

---

## 3. Storage (Images)

Storage buckets and objects are **not** copied by the database dump. Use a script to copy them.

### Create migration script

Create `scripts/migrate-storage.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const OLD_PROJECT_URL = process.env.OLD_SUPABASE_URL || 'https://old-project.supabase.co'
const OLD_SERVICE_KEY = process.env.OLD_SUPABASE_SERVICE_KEY

const NEW_PROJECT_URL = process.env.NEW_SUPABASE_URL || 'https://new-project.supabase.co'
const NEW_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY

;(async () => {
  const oldClient = createClient(OLD_PROJECT_URL, OLD_SERVICE_KEY)
  const newClient = createClient(NEW_PROJECT_URL, NEW_SERVICE_KEY)

  // List buckets in old project
  const { data: buckets } = await oldClient.storage.listBuckets()
  if (!buckets?.length) {
    console.log('No buckets found')
    return
  }

  for (const bucket of buckets) {
    console.log(`Migrating bucket: ${bucket.name}`)
    // Create bucket in new project if not exists
    await newClient.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
    }).catch(() => {}) // already exists

    const { data: files } = await oldClient.storage.from(bucket.name).list('', { limit: 1000 })
    if (!files?.length) continue

    for (const file of files) {
      if (file.name) {
        const { data } = await oldClient.storage.from(bucket.name).download(file.name)
        if (data) {
          await newClient.storage.from(bucket.name).upload(file.name, data, { upsert: true })
          console.log(`  Copied: ${file.name}`)
        }
      }
    }
  }
  console.log('Storage migration done')
})()
```

### Run it

```powershell
cd apps/mobile/myHaircodeFinal
$env:OLD_SUPABASE_URL="https://your-old-project.supabase.co"
$env:OLD_SUPABASE_SERVICE_KEY="your-old-service-role-key"
$env:NEW_SUPABASE_URL="https://your-new-project.supabase.co"
$env:NEW_SUPABASE_SERVICE_KEY="your-new-service-role-key"
node scripts/migrate-storage.js
```

### Alternative: full bucket copy via API

For many files, use the [Supabase Storage migration script](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore#migrate-storage-objects) from the docs. It copies objects from `storage.objects` and handles metadata.

---

## 4. Edge Functions

### Deploy to new project

```powershell
cd apps/mobile/myHaircodeFinal
supabase link --project-ref YOUR_NEW_PROJECT_REF
supabase functions deploy send-notification
supabase functions deploy deleteUser
```

Or deploy all:

```powershell
supabase functions deploy
```

---

## 5. Update `.env` Files

After migration, point your app to the new project.

### Backend (`apps/backend/.env`)

```
DATABASE_URL=postgresql://postgres.[NEW_REF]:[PASSWORD]@...
SUPABASE_URL=https://[NEW_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[new service role key]
SUPABASE_JWT_SECRET=[same as old if you copied it, else new]
```

### Mobile (`apps/mobile/myHaircodeFinal/.env`)

```
SUPABASE_PROJECTID=[NEW_PROJECT_REF]
SUPABASE_URL=https://[NEW_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[new service role key]
SUPABASE_ANON=[new anon key]
EXPO_PUBLIC_API_URL=http://...
```

---

## 6. Prisma (if used)

Your backend uses Prisma. After schema changes:

```powershell
cd apps/backend
npm run prisma:generate
```

If you changed the schema, run migrations:

```powershell
cd apps/backend
npx prisma migrate dev
```

---

## Quick Checklist

| Step | What | Command / Action |
|------|------|------------------|
| 1 | Dump old DB | `supabase db dump --db-url OLD_URL -f schema.sql` etc. |
| 2 | Restore to new DB | `psql NEW_URL -f schema.sql` etc. |
| 2b | Public data only | See section 1b above |
| 3 | Copy JWT secret | Old project → New project (Settings → API) |
| 4 | Migrate storage | Run `migrate-storage.js` or script from docs |
| 5 | Deploy functions | `supabase link` + `supabase functions deploy` |
| 6 | Update `.env` | Backend + mobile with new URLs and keys |

---

## Paid Plan: Restore to New Project

If you’re on a paid plan with physical backups:

1. Go to **Database → Backups → Restore to New Project**
2. Select a backup
3. Supabase creates a new project with schema, data, auth, roles, permissions

**Still manual:** Storage objects, Edge Functions, API keys, and some settings.

---

## Reference

- [Supabase Backup & Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Clone Project](https://supabase.com/docs/guides/platform/clone-project)
- [Auth Migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
