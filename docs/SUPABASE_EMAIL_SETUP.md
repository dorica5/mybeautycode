# Custom auth emails (myne branding)

Password reset and other auth emails are sent by **Supabase Auth** (`resetPasswordForEmail` in the backend). By default they come from Supabase’s shared sender and generic template.

To send as **myne** with your colours and logo:

1. **Custom SMTP** — “From” becomes e.g. `myne <noreply@myne.no>`
2. **Email templates** — HTML with mint green theme + logo

No app rebuild required — all changes are in **Supabase Dashboard** (and DNS for your domain).

---

## Step 1 — Choose an email provider

Use a **transactional** provider (not regular Gmail inbox):

| Provider | Notes |
|----------|--------|
| [Resend](https://resend.com) | Simple; good Supabase docs |
| SendGrid | Common choice |
| Postmark | High deliverability |
| Amazon SES | Cheapest at scale |

You need SMTP **host, port, username, password** (or API key as password).

---

## Step 2 — Verify domain `myne.no`

In your provider, add domain **myne.no** and create DNS records they give you (usually **SPF**, **DKIM**, sometimes **DMARC**).

Until DNS verifies, you can often send from a provider sandbox address for testing — but production should use `@myne.no`.

Suggested sender:

- **Email:** `noreply@myne.no` or `hello@myne.no`
- **Name:** `myne`

---

## Step 3 — Enable custom SMTP in Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **SMTP Settings** (or **Emails** → **SMTP**)
3. Turn on **Enable custom SMTP**
4. Fill in:

| Field | Example (Resend) |
|-------|------------------|
| Sender email | `noreply@myne.no` |
| Sender name | `myne` |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | your Resend API key |

5. **Save**
6. **Authentication** → **Rate limits** — raise if needed (default is low after enabling SMTP)

Send a test from the dashboard if available, or trigger **Forgot password** in the app.

---

## Step 4 — Branded email templates

1. **Authentication** → **Email Templates**
2. Edit each template you use (minimum: **Reset password** / Recovery)

### Reset password

- **Subject:** `Reset your myne password`
- **Body:** paste HTML from [`supabase-email-templates/recovery.html`](./supabase-email-templates/recovery.html)

**Important:** keep `{{ .ConfirmationURL }}` in the template — that is the reset link.

### Password changed (security notification)

Sent **after** a user updates their password (in-app change or via reset link).

1. **Authentication** → **Email Templates** → **Password changed** (under Security notifications)
2. Ensure **Password changed notifications** are **enabled** in auth settings
3. **Subject:** `Your myne password was changed`
4. **Body:** paste HTML from [`supabase-email-templates/password-changed-notification.html`](./supabase-email-templates/password-changed-notification.html)

Uses `{{ .Email }}` for the account address — keep that variable in the template.

### Email address changed (security notification)

Sent **after** a user’s login email is updated (not the confirmation link to the new address).

1. **Authentication** → **Email Templates** → **Email address changed** (under Security notifications)
2. Ensure the notification is **enabled** (project auth settings)
3. **Subject:** `Your myne email address was changed`
4. **Body:** paste HTML from [`supabase-email-templates/email-changed-notification.html`](./supabase-email-templates/email-changed-notification.html)

Variables used: `{{ .OldEmail }}` and `{{ .Email }}` (new address). Do not remove them.

### Logo in emails

The template uses a hosted logo:

```html
<img src="https://myne.no/icons/icon-192.png" alt="myne" width="72" height="72" />
```

Requirements:

- `apps/web` deployed so `https://myne.no/icons/icon-192.png` loads in a browser
- PNG works in all email clients (SVG is unreliable in email)

To change the image, upload a PNG to `apps/web/public/icons/` and redeploy the site.

### Brand colours (already in template)

| Token | Hex |
|-------|-----|
| Mint background | `#B2DCC5` |
| Card | `#F1F9F4` |
| Accent band | `#D8EDE2` |
| Text / button | `#212427` |

---

## Step 5 — Redirect URL (web bridge + app)

Password reset links should land on the website first, then open the app on a phone:

**Authentication** → **URL Configuration** → **Redirect URLs** (add both):

```
https://myne.no/reset-password
myne://reset-password
```

The backend sends users to `https://myne.no/reset-password` (override with `PASSWORD_RESET_REDIRECT_URL` on Render). That page:

- **On a phone** — opens `myne://reset-password` with the tokens from the email link.
- **On a computer** — shows a clear message that the link must be opened on a phone (with a copy-link button).

Deploy the web app before switching the backend redirect, and keep `myne://reset-password` in the list for older emails.

---

## Step 6 — Test end-to-end

1. App → **Reset password** → enter a real account email
2. Inbox should show:
   - **From:** `myne` / `noreply@myne.no` (not Supabase)
   - Mint-themed email with logo
3. Tap link → app opens → set new password

---

## Norwegian copy (optional)

Duplicate the template in Supabase or swap strings, e.g.:

- Subject: `Tilbakestill myne-passordet ditt`
- Button: `Tilbakestill passord`

Supabase does not pick app locale automatically — one template language per project unless you customize via Edge Functions later.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Still says “Supabase” as sender | Custom SMTP not saved or DNS not verified |
| Email not arriving | Check provider logs; verify SPF/DKIM; check spam |
| Link opens browser, not app | Add `https://myne.no/reset-password` and `myne://reset-password` to Redirect URLs; deploy web + backend |
| Broken logo in Supabase preview | Templates embed the logo as base64 (no external URL). Re-run `node scripts/embed-email-logo.mjs` after changing `apps/web/public/icons/icon-192.png` |
| “Could not send” from app | Supabase rate limit or SMTP credentials wrong |

---

## Files in this repo

| File | Purpose |
|------|---------|
| `docs/supabase-email-templates/recovery.html` | Password reset template |
| `docs/supabase-email-templates/password-changed-notification.html` | “Your password was changed” security notification |
| `docs/supabase-email-templates/email-changed-notification.html` | “Your email was changed” security notification |
| `apps/backend/src/services/authService.ts` | Triggers Supabase reset email |

Auth email content is **not** in the mobile app or Render API — only Supabase + SMTP.
