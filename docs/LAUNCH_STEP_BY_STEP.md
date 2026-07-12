# Launch step-by-step (Render → EAS → testing → subscriptions → Slack)

Follow these phases **in order**. Each phase has checkpoints — do not skip ahead if a checkpoint fails.

**Your app cannot run in normal Expo Go** (the purple Expo app). It uses native modules (RevenueCat, etc.), so you need a **development build** (custom dev client). The QR code from `npm start` only works **after** that dev build is installed on your phone.

**EAS project (new):** `@dorica/mybeautycode` — ID `4b757cda-0041-447c-95f9-0b36c1d70c6c`  
**Android package / iOS bundle:** `com.dorica.myne`

---

## Phase 0 — Accounts you need (one-time)

Create or log into:

| Service | URL | Why |
|---------|-----|-----|
| GitHub | github.com | Render deploys from your repo |
| Render | render.com | Host the API |
| Expo / EAS | expo.dev | Builds (logged in as **dorica**) |
| Supabase | supabase.com | Auth + database (already have project) |
| Firebase | console.firebase.google.com | Android `google-services.json` |
| RevenueCat | app.revenuecat.com | Subscriptions |
| Google Play Console | play.google.com/console | Android store + billing |
| App Store Connect | appstoreconnect.apple.com | iOS store + billing |
| Slack | api.slack.com/apps | Feedback + report webhooks |

---

## Phase 1 — Deploy backend on Render (~30–45 min)

This gives you a permanent `https://…` URL so phones and store reviewers can reach your API.

### 1.1 Push code to GitHub (if not already)

```powershell
cd "c:\Users\dorca\OneDrive\Dokumenter\myHaircode"
git status
git add .
git commit -m "Prepare for Render deploy"
git push origin main
```

(Use your actual branch name if not `main`.)

### 1.2 Create Render account

1. Go to [render.com](https://render.com) → Sign up (GitHub login is easiest).
2. Connect your GitHub account when asked.

### 1.3 Create the web service

1. Render Dashboard → **New +** → **Web Service**.
2. Connect repository **myHaircode** (or your repo name).
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `myne-api` (or any name) |
| **Region** | Frankfurt (EU) — close to Supabase EU |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `apps/backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma migrate deploy && npm run start` |
| **Plan** | **Starter** ($7/mo) — required for reliable store review |

4. Click **Advanced** → add **Health Check Path:** `/health`

### 1.4 Add environment variables on Render

Still on the service setup page (or later: Service → **Environment**), add every variable from your local `apps/backend/.env`:

| Key | Where to get it |
|-----|-----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (pooler, port 6543) |
| `DIRECT_URL` | Same page, direct connection (port 5432) — needed for migrations |
| `SUPABASE_URL` | `https://znwlrfogoczqsaaqvjqv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Secret |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |

Optional (add later in Phase 8):

| Key | Purpose |
|-----|---------|
| `SLACK_FEEDBACK_WEBHOOK_URL` | Feedback → Slack |
| `SLACK_REPORTS_WEBHOOK_URL` | User reports → Slack |
| `BILLING_TEST_SUBSCRIBED_PROFILE_IDS` | QA subscriber badge only |

**Do not** paste Slack URLs until Phase 8 — but you can leave them empty for now.

### 1.5 Deploy

1. Click **Create Web Service** (or **Save** + **Manual Deploy**).
2. Watch **Logs** tab. Success looks like:
   - Build finishes (`npm run build` OK)
   - `npx prisma migrate deploy` OK
   - `Backend running on http://localhost:3001` (Render maps this to HTTPS)

### 1.6 Verify API works

Render gives you a URL like `https://myne-api.onrender.com`.

**On your phone** (cellular or Wi‑Fi), open in Safari/Chrome:

```
https://YOUR-RENDER-URL.onrender.com/health
```

You should see JSON: `{"status":"ok",...}`

Also try:

```
https://YOUR-RENDER-URL.onrender.com/health/db
```

Should show `"database":"connected"`. If not, fix `DATABASE_URL` on Render (Supabase project paused is a common cause).

**Write down your API URL** — you need it everywhere below:

```
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-URL.onrender.com
```

---

## Phase 2 — EAS new project + environment variables (~20 min)

Your app is already linked to **@dorica/mybeautycode**. Now add secrets so cloud builds work.

### 2.1 Install EAS CLI (once)

```powershell
npm install -g eas-cli
eas login
```

### 2.2 Confirm project

```powershell
cd "c:\Users\dorca\OneDrive\Dokumenter\myHaircode\apps\mobile\myHaircodeFinal"
eas project:info
```

Expected:

```
fullName  @dorica/mybeautycode
ID        4b757cda-0041-447c-95f9-0b36c1d70c6c
```

### 2.3 Set environment variables on EAS

Run from `apps/mobile/myHaircodeFinal`. Replace values with yours.

**For local dev + preview + production** (use `--environment` flags as shown):

```powershell
# Public API (from Phase 1)
eas env:create --name EXPO_PUBLIC_API_URL --value "https://YOUR-RENDER-URL.onrender.com" --environment development --environment preview --environment production

# Supabase (from mobile .env)
eas env:create --name SUPABASE_URL --value "https://znwlrfogoczqsaaqvjqv.supabase.co" --environment development --environment preview --environment production

eas env:create --name SUPABASE_ANON --value "YOUR_ANON_KEY" --environment development --environment preview --environment production --visibility secret

eas env:create --name SUPABASE_FUNCTION_URL --value "https://znwlrfogoczqsaaqvjqv.functions.supabase.co" --environment development --environment preview --environment production

# RevenueCat
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_YOUR_KEY" --environment development --environment preview --environment production --visibility secret

eas env:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "goog_YOUR_KEY" --environment development --environment preview --environment production --visibility secret

# Google
eas env:create --name EXPO_PUBLIC_GOOGLE_PLACES_API_KEY --value "YOUR_KEY" --environment development --environment preview --environment production --visibility secret
```

List what you set:

```powershell
eas env:list --environment preview
```

### 2.4 Fix Firebase + upload `google-services.json`

Your file still has package `com.dorica.myHaircodeFinal` — must be `com.dorica.myne`.

1. [Firebase Console](https://console.firebase.google.com/) → project **myhaircode**
2. **Add app** → Android → package name **`com.dorica.myne`**
3. Download **`google-services.json`**
4. Save to: `apps/mobile/myHaircodeFinal/google-services.json`

Upload to EAS (file is gitignored):

```powershell
cd apps/mobile/myHaircodeFinal
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --environment preview --environment production
```

### 2.5 Update local `.env` for day-to-day dev

Edit `apps/mobile/myHaircodeFinal/.env`:

```env
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-URL.onrender.com
REACT_NATIVE_PACKAGER_HOSTNAME=YOUR_PC_LAN_IP
```

Keep Supabase and RevenueCat keys as they are.

---

## Phase 3 — Dev client + QR code (~30 min first time)

This is **not Expo Go**. You build a custom app shell once, install it on your phone, then use the QR code for fast reloads.

### 3.1 Option A — EAS development build (recommended)

```powershell
cd apps/mobile/myHaircodeFinal
npm run build:dev:android
```

(or `build:dev:ios` for iPhone)

1. Wait for build on [expo.dev](https://expo.dev) → project **mybeautycode**
2. Open the build page → **Install** on your Android phone (scan QR or download APK)

### 3.2 Option B — USB build (Android only, if you have Android Studio)

```powershell
cd apps/mobile/myHaircodeFinal
npm run android
```

### 3.3 Start Metro + QR code

**After** the dev build is installed on your phone:

```powershell
cd apps/mobile/myHaircodeFinal
npm start
```

- A **QR code** appears in the terminal (or press `w` for web UI)
- Open the **dev client** app on your phone (icon says **myne**, not Expo Go)
- Scan the QR code

**If connection fails:** set `REACT_NATIVE_PACKAGER_HOSTNAME` in `.env` to your PC’s LAN IP (same Wi‑Fi as phone), restart with:

```powershell
npx expo start --dev-client -c
```

### 3.4 Smoke test the dev build

- [ ] Sign in works
- [ ] Home / map loads (needs Google keys)
- [ ] API calls work (not “network error”) — confirms Render URL

---

## Phase 4 — Test forgot / change password (~15 min)

### 4.1 Supabase dashboard (one-time)

1. [Supabase](https://supabase.com/dashboard) → your project
2. **Authentication** → **URL Configuration**
3. **Redirect URLs** → add:
   ```
   myhaircode://reset-password
   ```
4. Save

### 4.2 Forgot password (logged out)

1. Sign out → **Sign in** → **Reset password**
2. Enter email for a **real user** in your Supabase project
3. Check email on the phone
4. **Happy path:** tap link → app opens → set new password → sign in

**If link opens browser instead of app:** on **Check mail** screen, use **“Paste recovery link”** (visible on dev/preview builds only).

### 4.3 Change password (logged in)

1. Sign in → **Profile** → **Change password**
2. Enter old password + new password → save
3. Sign out → sign in with new password

### 4.4 Production note

Store **production** builds do not show paste-link UI. Deep link must work before you submit.

---

## Phase 5 — Android APK/AAB for Play Console + RevenueCat (~45 min)

RevenueCat’s Android app needs your app registered in **Google Play** with at least one uploaded build.

### 5.1 Google Play Console setup

1. [Play Console](https://play.google.com/console) → **Create app**
2. App name: **myne**
3. Package name: **`com.dorica.myne`** (must match exactly)

### 5.2 Build preview APK (install on your phone for testing)

```powershell
cd apps/mobile/myHaircodeFinal
npm run build:preview:android
```

- Profile: **preview** → release **APK**, internal distribution
- Install from EAS build page when done

### 5.3 Build production AAB (for Play Store upload)

```powershell
npm run build:production:android
```

- Profile: **production** → **AAB** (Android App Bundle)

### 5.4 Upload to Play Console

1. Play Console → your app → **Testing** → **Internal testing** (start here)
2. **Create new release** → upload the **AAB** from EAS
3. Complete required store listing fields (privacy policy URL, screenshots, etc.) as prompted
4. **Roll out** internal testing release

You need the app in Play Console before Google Play Billing + RevenueCat Android fully work.

### 5.5 Create subscriptions in Play Console

1. **Monetize** → **Products** → **Subscriptions**
2. Create products (e.g. monthly + annual) — note the **Product IDs**
3. Activate them

### 5.6 Add Android app in RevenueCat

1. [RevenueCat](https://app.revenuecat.com) → your project
2. **Apps** → add **Android** → package `com.dorica.myne`
3. Link **Google Play** (service credentials / JSON from Play Console → API access)
4. Copy **Android API key** (`goog_…`) → EAS env + local `.env`

### 5.7 Configure products in RevenueCat

1. **Products** → import/link Play subscription IDs
2. **Entitlements** → create **`premium`**
3. Attach products to entitlement
4. **Offerings** → create offering → set as **Current** → add monthly + annual packages

### 5.8 iOS (parallel track, if reviewing both stores)

1. App Store Connect → app `com.dorica.myne`
2. Subscriptions matching RevenueCat
3. `npm run build:production:ios` → upload via EAS submit or Transporter

---

## Phase 6 — Test subscriptions (~20 min)

### 6.1 Prerequisites

- [ ] Preview or production build installed (not Expo Go, not dev with `EXPO_PUBLIC_BYPASS_PRO_PAYWALL=true`)
- [ ] RevenueCat Android key is real (`goog_…`, not placeholder)
- [ ] Play internal release published with subscriptions active
- [ ] **License testing:** Play Console → **Settings** → **License testing** → add your Gmail

### 6.2 Test flow on Android

1. Sign in as **professional** account (or create one)
2. Complete pro setup until **paywall** appears (or open **Profile → Billing**)
3. Confirm prices load (not “products not available”)
4. Tap subscribe → complete **test purchase** (license tester = no real charge)
5. **Profile → Restore purchases** — should recognize subscription
6. Create visits beyond free limit — should work when subscribed

### 6.3 If paywall says “not configured”

| Symptom | Fix |
|---------|-----|
| `rcNotConfigured` | RevenueCat API key missing in build → set EAS env, rebuild |
| `productsNotAvailable` | Play products not linked in RevenueCat offering, or no Play release yet |
| Purchase fails immediately | License tester not added, or wrong Google account on device |

### 6.4 iOS sandbox test

1. App Store Connect → **Users and Access** → **Sandbox** testers
2. Sign out of real Apple ID on device → purchase prompts sandbox login
3. Same paywall flow as Android

---

## Phase 7 — Connect feedback to Slack (~15 min)

Feedback is sent to your **backend on Render**, which posts to Slack.

### 7.1 Create Slack webhook

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Name: `myne-feedback` → pick your workspace
3. **Incoming Webhooks** → On → **Add New Webhook to Workspace**
4. Pick channel (e.g. `#feedback`) → copy URL (`https://hooks.slack.com/services/...`)

### 7.2 Add to Render (not only local `.env`)

1. Render → **myne-api** → **Environment**
2. Add:
   ```
   SLACK_FEEDBACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   ```
3. **Save** → Render redeploys automatically

Also add to local `apps/backend/.env` for local testing.

### 7.3 Test from server

```powershell
cd apps/backend
npm run slack:feedback:test
```

You should see a test message in Slack.

### 7.4 Test from app

1. Open app → **Profile** → **Gi tilbakemelding** / Feedback
2. Submit feedback with title + description
3. Message should appear in Slack within seconds

---

## Phase 8 — Verify user reports (~15 min)

### 8.1 Create reports webhook (can be same Slack app, different channel)

1. Same Slack app → **Incoming Webhooks** → add another webhook → channel `#reports`
2. Copy URL

### 8.2 Add to Render

```
SLACK_REPORTS_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Save → wait for redeploy.

### 8.3 Test from server

```powershell
cd apps/backend
npm run slack:reports:test
```

### 8.4 Test from app

1. Open another user’s profile (or a test account)
2. **Report** → pick reason → optional details → submit
3. Slack `#reports` should get a structured message with reporter, reported user, reason, lane

Reports are also saved in the database; Slack is the notification layer.

---

## Phase 9 — Store submission (after everything above passes)

See [`STORE_SUBMISSION.md`](./STORE_SUBMISSION.md) for the final checklist.

Quick commands:

```powershell
cd apps/mobile/myHaircodeFinal
npm run build:production:all
npm run submit:android
npm run submit:ios
```

Deploy `apps/web` so `https://myne.no/terms` and `/privacy` work.

Add **demo account** email + password in App Store Connect and Play Console review notes.

---

## Master checklist (print this)

```
PHASE 1 — RENDER
[ ] GitHub repo pushed
[ ] Render Web Service created (root: apps/backend, Starter plan)
[ ] All backend env vars set on Render
[ ] https://….onrender.com/health works on phone
[ ] /health/db shows connected

PHASE 2 — EAS
[ ] eas project:info shows @dorica/mybeautycode
[ ] EXPO_PUBLIC_API_URL + Supabase + RevenueCat + Google on EAS
[ ] google-services.json fixed (com.dorica.myne) + uploaded to EAS

PHASE 3 — DEV CLIENT + QR
[ ] development or preview build installed on phone
[ ] npm start → scan QR in dev client (not Expo Go)
[ ] Sign in + API works against Render

PHASE 4 — PASSWORD
[ ] Supabase redirect myhaircode://reset-password added
[ ] Forgot password works (link or paste on dev build)
[ ] Change password while logged in works

PHASE 5 — PLAY + REVENUECAT
[ ] Play app com.dorica.myne created
[ ] production AAB uploaded to internal testing
[ ] Play subscriptions created
[ ] RevenueCat Android app + offering configured

PHASE 6 — SUBSCRIPTIONS
[ ] Paywall shows prices on device build
[ ] Test purchase succeeds (license tester / sandbox)
[ ] Restore purchases works

PHASE 7 — FEEDBACK → SLACK
[ ] SLACK_FEEDBACK_WEBHOOK_URL on Render
[ ] slack:feedback:test + in-app feedback both work

PHASE 8 — REPORTS → SLACK
[ ] SLACK_REPORTS_WEBHOOK_URL on Render
[ ] slack:reports:test + in-app report both work

PHASE 9 — STORE
[ ] myne.no terms/privacy live
[ ] production builds submitted
[ ] demo credentials in review notes
```

---

## Common mistakes

| Mistake | Reality |
|---------|---------|
| Using Expo Go | Won’t work — need dev client build |
| `EXPO_PUBLIC_API_URL` = LAN IP in EAS production | Store build breaks for reviewers |
| Preview APK for Play production review | Use **production AAB** for store |
| RevenueCat Android before Play upload | Upload AAB to internal testing first |
| Slack only in local `.env` | Must be on **Render** for deployed API |
| `google-services.json` wrong package | Gradle build fails on EAS |

---

## If you get stuck

| Problem | Where to look |
|---------|----------------|
| Render build fails | Render → Logs tab |
| EAS build fails | expo.dev → build → failed phase logs |
| API 401 / network | Phone URL `/health`, then `EXPO_PUBLIC_API_URL` in app |
| Password email not arriving | Supabase → Auth → Email templates / rate limits |
| Subscription errors | RevenueCat → Customers + Play license testers |

Start with **Phase 1** and do not move on until `/health` works on your phone.
