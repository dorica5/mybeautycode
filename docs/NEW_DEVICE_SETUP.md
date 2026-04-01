# New machine / new device setup

Use this checklist after you already have the repo on disk (for example after `git clone` or `git pull`). It covers **dependencies**, **environment files**, **database migrations**, and **running the backend + mobile app**.

---

## 1. Prerequisites

- **Node.js**: current LTS (e.g. 20.x). Verify with `node -v` and `npm -v`.
- **Git**: optional here; assumed you can obtain the repo without this document.
- **Mobile development** (only if you build/run native binaries):
  - Android: Android Studio + SDK (for `expo run:android`).
  - iOS (macOS): Xcode (for `expo run:ios`).
- **Supabase**: access to the project dashboard (URL, anon key, service role key, DB password, project ref).
- **Same network** as your phone when testing on a physical device, or use Expo tunnel (slower).

---

## 2. Install dependencies

From the **repository root** (`myHaircode` / monorepo root):

```bash
npm install
```

That installs workspace packages for `apps/*` (including backend and mobile).

---

## 3. Backend environment (`apps/backend/.env`)

Copy the template and fill in real values:

```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env`. You need:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres for **runtime** (Prisma Client). On Supabase, the **Session pooler** URI on port **6543** with `?pgbouncer=true` is typical. |
| `DIRECT_URL` | **Direct** Postgres on port **5432** (`db.<project-ref>.supabase.co`). Required for `npx prisma migrate deploy` (migrate on the pooler often **hangs** or misbehaves). If you only use a direct URL for everything, you may set `DIRECT_URL` **equal** to `DATABASE_URL`. |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Settings → API → service_role** (keep secret; backend only). |
| `SUPABASE_JWT_SECRET` | Reserved / optional depending on your code; align with `.env.example` and team docs. |
| `PORT` | Default `3000` unless you override. |

Do **not** commit `.env`.

---

## 4. Prisma: generate and migrate

Always run from **`apps/backend`** with a working `DATABASE_URL` and **`DIRECT_URL`** set:

```bash
cd apps/backend
npx prisma generate
npx prisma migrate deploy
```

- If a migration **failed** once, fix the error, then use Prisma’s [resolve](https://www.prisma.io/docs/guides/migrate/troubleshooting-development) commands before deploying again (for example `npx prisma migrate resolve --rolled-back "<migration_name>"`).
- **Seed** (optional; reference data can also come from migrations):

```bash
npm run prisma:seed
```

---

## 5. Start the backend

```bash
cd apps/backend
npm run dev
```

Sanity checks (from the same machine, adjust host/port if needed):

- `GET http://localhost:3000/health` → `{ "status": "ok", ... }`
- `GET http://localhost:3000/health/db` → `{ "status": "ok", "database": "connected" }`

If `/health/db` returns **503**, the API cannot reach Postgres: resume the Supabase project, verify `DATABASE_URL` / network, and ensure migrations have been applied.

---

## 6. Mobile environment (`apps/mobile/myHaircodeFinal/.env`)

Create or copy env for Expo (see existing teammates’ `.env` **names** only; do not commit secrets).

Typical variables:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Same project URL as backend. |
| `SUPABASE_ANON` | **Settings → API → anon** `public` key. |
| `SUPABASE_FUNCTION_URL` | Edge functions base URL if you use it (`https://<ref>.functions.supabase.co`). |
| `EXPO_PUBLIC_API_URL` | Base URL of the **backend** as reachable **from the phone**: e.g. `http://<your-lan-ip>:3000`. **Not** `localhost` on a physical device. |
| `REACT_NATIVE_PACKAGER_HOSTNAME` | Often the same LAN IP as above so Metro is reachable from the device. |

`app.config.js` reads these and exposes `extra` to the app (`SUPABASE_URL`, `SUPABASE_ANON`, `EXPO_PUBLIC_API_URL`, etc.).

**Finding your LAN IP:**

- Windows: `ipconfig` → IPv4 of your active Wi‑Fi / Ethernet adapter.
- macOS/Linux: `ipconfig getifaddr en0` or `hostname -I`.

Use the IP of the machine that runs `npm run dev` for the backend.

---

## 7. Start the mobile app

```bash
cd apps/mobile/myHaircodeFinal
npm install
npm start
```

Then open in Expo Go or run a native build (`npm run android` / `npm run ios`) per your workflow.

- Phone and PC must reach **`EXPO_PUBLIC_API_URL`** (same Wi‑Fi, correct IP, OS firewall allows port **3000**).
- If the API URL is wrong, login and `/api/auth/me` will fail and navigation can send you to setup incorrectly.

---

## 8. Quick verification checklist

- [ ] Backend: `/health` and `/health/db` OK  
- [ ] Mobile `.env`: `EXPO_PUBLIC_API_URL` points to **your** dev machine IP + port  
- [ ] Supabase project **not paused**  
- [ ] `npx prisma migrate deploy` completed without errors  
- [ ] Professions exist if inspiration/home calls need them (migrations + optional seed)  

---

## 9. Common issues

| Symptom | What to check |
|---------|----------------|
| `Can't reach database server` (Prisma) | Supabase paused; wrong `DATABASE_URL`; blocked **5432** — use `DIRECT_URL` for migrate; pooler for app. |
| `prisma migrate deploy` hangs | Use **`DIRECT_URL`** on port **5432**, not only the pooler. |
| App stuck on setup / no profile | Backend `/api/auth/me` failing; token not attached — fixed in client if `apiClient` resolves session; see repo history. |
| `Profession "hair" not found` | Run migrations (and `npm run prisma:seed` if needed) so `professions` is populated. |
| Push token / API errors on device | Device must use LAN IP for API; Windows Firewall may block inbound **3000**. |

---

## 10. Security reminder

- Never commit `apps/backend/.env` or `apps/mobile/myHaircodeFinal/.env`.
- **Service role** key must only live on the server/backend, not in the mobile app.
- Rotate keys if they were ever committed or leaked.
