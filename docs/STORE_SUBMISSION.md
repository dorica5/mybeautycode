# App Store & Play Store submission

This is **not** the same as an internal preview build. Apple and Google reviewers install your **production** build, create or use accounts, and test core flows on their own devices at unpredictable times. A tunnel from your laptop or a misconfigured preview APK will fail review.

Use profile **`production`** only for store submission. Profile **`preview`** is for your own QA.

---

## What reviewers will test (and what rejects you)

| Area | Rejection risk if broken |
|------|--------------------------|
| App launches, sign in / sign up | **High** — app appears broken |
| API calls (visits, profiles, map) | **High** — needs **always-on HTTPS backend** |
| Forgot password | **High** — must work via email deep link (no dev paste UI in production) |
| Subscriptions (pro paywall) | **High** — products must load and purchase/restore must work |
| Terms & Privacy links on paywall | **High** — must open real public URLs |
| Account deletion | **Medium** — you have this in Profile |
| Push notifications | **Low** at review — but Android build needs valid `google-services.json` |

Production builds **do not** include `EXPO_PUBLIC_DEV_PASSWORD_RESET` or paywall bypass flags.

---

## 1. Backend — must be always-on (not a tunnel)

Reviewers will **not** hit your laptop. Cheapest options that actually work for store review:

| Option | Cost | Verdict |
|--------|------|---------|
| Cloudflare / ngrok tunnel | $0 | **Do not use for store review** — goes down when your PC sleeps |
| Render **free** | $0 | **Risky** — cold starts; reviewer may see timeouts |
| **Render Starter** | ~$7/mo | **Recommended minimum** — always on, HTTPS, simple |
| Railway | ~$5/mo | Good alternative |

Deploy `apps/backend` (see `render.yaml` in that folder). Set env vars from `apps/backend/.env.example` on the host.

After deploy, verify from your **phone** (not Wi‑Fi-only localhost):

```
https://YOUR-API-DOMAIN/health
```

Set on EAS project **@dorica/mybeautycode**, environment **production**:

```
EXPO_PUBLIC_API_URL=https://YOUR-API-DOMAIN
```

Rebuild with `npm run build:production:all` after setting this.

---

## 2. EAS — new project, production profile

Project: **@dorica/mybeautycode** (`4b757cda-0041-447c-95f9-0b36c1d70c6c`)

### Production environment variables (required)

Copy from your working `.env` — all must be set on **production** (and rebuilt into the app):

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Hosted Supabase |
| `SUPABASE_ANON` | Secret |
| `SUPABASE_FUNCTION_URL` | If used |
| `EXPO_PUBLIC_API_URL` | **Public HTTPS API** |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | Real `appl_…` key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Real `goog_…` key (not placeholder) |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | For address search in pro setup |
| `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY` | Optional but map may break without it |
| `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` | Optional but map may break without it |

**Do not** set on production: `EXPO_PUBLIC_BYPASS_PRO_PAYWALL`, `EXPO_PUBLIC_DEV_PASSWORD_RESET`.

### Android Firebase file

Package must be **`com.dorica.myne`** (your current `google-services.json` still says `com.dorica.myne` — fix in Firebase first).

```powershell
cd apps/mobile/myne
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --environment preview
```

### Build for stores

```powershell
cd apps/mobile/myne
npm run build:production:android   # AAB for Play Store
npm run build:production:ios       # IPA for App Store
```

Submit:

```powershell
npm run submit:android
npm run submit:ios
```

---

## 3. Supabase — forgot password (production)

Dashboard → Authentication → URL Configuration:

- **Redirect URLs:** `myne://reset-password`
- **Site URL:** can stay as-is; redirect URL is what matters

Test on a **production** build: request reset → open email on device → app opens → new password → sign in. No paste-link UI should appear.

---

## 4. RevenueCat + stores (subscriptions)

Reviewers **will** open the pro paywall. If they see *"Subscriptions are not configured yet on this build"* → likely rejection.

### RevenueCat

- iOS + Android apps: `com.dorica.myne`
- Entitlement: `premium`
- Offering with monthly + annual packages linked to store product IDs

### Apple App Store Connect

- Subscription group + products matching RevenueCat
- Paid Apps agreement signed
- Sandbox tester for your own testing; reviewers use their own sandbox

### Google Play Console

- App created with `com.dorica.myne`
- Subscriptions created and **active**
- Upload **production AAB** at least to internal/closed track before billing works
- License testers for your testing

---

## 5. Website — legal URLs

Paywall opens:

- https://myne.no/terms
- https://myne.no/privacy

Deploy `apps/web` before submission. Broken links on the paywall are a common rejection reason.

---

## 6. App Review notes (provide demo access)

In App Store Connect and Play Console, add **App Review Information**:

- Demo email + password that works (client account and/or pro account)
- Short steps: sign in → main features
- If pro subscription is required to test visits: note free visit limit (10) or provide a pro test account that already completed setup

Do **not** rely on `BILLING_TEST_SUBSCRIBED_PROFILE_IDS` for reviewers — that only affects your backend badge logic, not store IAP.

---

## 7. Pre-submit checklist

- [ ] API live at HTTPS URL; `/health` works from phone on cellular
- [ ] EAS **production** env complete (API, Supabase, RevenueCat, Google)
- [ ] `google-services.json` package = `com.dorica.myne`, uploaded to EAS
- [ ] Supabase redirect `myne://reset-password` added
- [ ] RevenueCat offerings load on production build (real device)
- [ ] Test purchase + restore on iOS sandbox and Android license tester
- [ ] myne.no/terms and /privacy live
- [ ] Production AAB + IPA built from **@dorica/mybeautycode**
- [ ] Demo account credentials in review notes
- [ ] No `example.com` links, no dev-only UI visible in production build

---

## Cost summary (realistic minimum for approval)

| Item | Monthly |
|------|---------|
| Render Starter (API) | ~$7 |
| Supabase | $0 (free tier, if project active) |
| EAS | Free tier builds usually enough |
| RevenueCat | Free to ~$2.5k MTR |
| Domain myne.no | Already assumed |

**~$7/mo** for the API is the cheapest reliable path. Everything else is configuration, not more hosting.
