# Review delivery checklist

> **Submitting to App Store / Play Store?** Use [`STORE_SUBMISSION.md`](./STORE_SUBMISSION.md) instead. Preview builds and tunnels are not enough for store review.

Use this before handing the app to **internal** reviewers. Work through each section in order.

---

## 1. Backend must be reachable from phones

EAS builds cannot call `http://192.168.x.x:3001`. You need **one** of:

- A deployed API (Railway, Render, Fly.io, VPS, etc.) with `EXPO_PUBLIC_API_URL` pointing to it
- A stable tunnel while testing (ngrok, Cloudflare Tunnel) — OK for a short review window

**Verify:** open `https://YOUR_API/health` (or any known route) from your phone's browser.

---

## 2. Supabase — forgot password

Password reset is **Supabase-only** (no backend endpoint).

### Hosted project (what the app uses today)

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   myne://reset-password
   ```
3. Confirm **Email** provider is enabled (Authentication → Providers → Email).
4. Optional: configure custom SMTP if default rate limits are too low for testing.

### Test flow

1. Sign in screen → **Reset password** → enter a real user email
2. Open the recovery email on the device
3. If the app opens automatically → set new password
4. If not → on **Check mail**, use **"Paste recovery link"** (enabled on dev + preview builds)

Preview/development builds set `EXPO_PUBLIC_DEV_PASSWORD_RESET=true` in `eas.json`.

---

## 3. Firebase — Android push + `google-services.json`

**Critical:** your local `google-services.json` uses package `com.dorica.myne`, but the app uses `com.dorica.myne`. They must match.

1. [Firebase Console](https://console.firebase.google.com/) → project **myne-mycare**
2. Add Android app with package **`com.dorica.myne`** (or update existing app)
3. Download new `google-services.json` → save to:
   ```
   apps/mobile/myne/google-services.json
   ```
4. Upload to EAS (file is gitignored and won't upload automatically):

   ```powershell
   cd apps/mobile/myne
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   ```

`app.config.js` reads `GOOGLE_SERVICES_JSON` during cloud builds.

---

## 4. RevenueCat + store subscriptions

Subscriptions only work on **real device builds** (dev client, preview APK, or store build) — not Expo Go.

### RevenueCat dashboard

1. Create/link **iOS** app (`com.dorica.myne`) and **Android** app (`com.dorica.myne`)
2. Create entitlement: **`premium`**
3. Create products (monthly + annual) and add to a **current offering**
4. Copy API keys into EAS environment (see section 5)

### Android (required for Play billing)

1. **Google Play Console** → create app `com.dorica.myne` if not done
2. Create subscription products matching RevenueCat
3. Upload at least one **internal testing** release (preview APK from EAS works)
4. Add license testers in Play Console → **License testing**

### iOS

1. **App Store Connect** → subscriptions matching RevenueCat product IDs
2. Sandbox tester account for purchase testing

### Env keys

```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

Replace the `goog_xxxxxxxx` placeholder in your local `.env`.

---

## 5. EAS environment variables

Set once per EAS project (values from your `.env`, but **API URL must be public**):

```powershell
cd apps/mobile/myne

eas env:create --name SUPABASE_URL --value "https://znwlrfogoczqsaaqvjqv.supabase.co" --environment preview --environment production
eas env:create --name SUPABASE_ANON --value "YOUR_ANON_KEY" --environment preview --environment production --visibility secret
eas env:create --name SUPABASE_FUNCTION_URL --value "https://znwlrfogoczqsaaqvjqv.functions.supabase.co" --environment preview --environment production
eas env:create --name EXPO_PUBLIC_API_URL --value "https://YOUR_PUBLIC_API" --environment preview --environment production
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_..." --environment preview --environment production --visibility secret
eas env:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY --value "goog_..." --environment preview --environment production --visibility secret
eas env:create --name EXPO_PUBLIC_GOOGLE_PLACES_API_KEY --value "AIza..." --environment preview --environment production --visibility secret
```

List configured vars:

```powershell
eas env:list --environment preview
```

---

## 6. Build commands

Logged in as **dorica** on EAS. From `apps/mobile/myne`:

| Goal | Command |
|------|---------|
| Dev client (iOS) | `npm run build:dev:ios` |
| Dev client (Android APK) | `npm run build:dev:android` |
| **Review APK (Android)** | `npm run build:preview:android` |
| Review build (both) | `npm run build:preview:all` |
| Store production | `npm run build:production:all` |

First build will prompt for credentials (remote = EAS manages signing).

Install Android preview APK from the link EAS prints when the build finishes.

---

## 7. Website legal pages (paywall links)

Paywall links point to:

- Terms: `https://myne.no/terms`
- Privacy: `https://myne.no/privacy`

Deploy `apps/web` to Vercel (or your host) before store submission. Pages exist at `/terms` and `/privacy`.

Local check:

```powershell
cd apps/web
npm run dev
```

---

## 8. Pre-review smoke test

| Feature | How to verify |
|---------|----------------|
| Sign in / sign up | Real Supabase user |
| Forgot password | Email → link or paste link on Check mail |
| Map / places | Google keys in EAS env |
| Pro paywall | Preview APK + RevenueCat + store products |
| Subscriber badge | `BILLING_TEST_SUBSCRIBED_PROFILE_IDS` on backend `.env` + restart backend |
| Feedback → Slack | `SLACK_FEEDBACK_WEBHOOK_URL` in backend `.env` |

---

## 9. Store submit (when ready)

```powershell
npm run submit:android
npm run submit:ios
```

Configure Play service account and App Store Connect API key in EAS (`eas credentials` / dashboard) instead of local JSON paths.

---

## Quick "tonight" minimum

If time is short, do these four things:

1. Fix `google-services.json` package → `com.dorica.myne` + upload EAS file secret
2. Add `myne://reset-password` in Supabase redirect URLs
3. Set EAS env vars (especially `EXPO_PUBLIC_API_URL` + RevenueCat Android key)
4. Run `npm run build:preview:android` and install the APK on your phone
