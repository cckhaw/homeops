# Wodejia

Mobile-first PWA: a digital passport for your home — assets and warranties, seasonal maintenance, receipt scanning, a private document vault, contractors, utility bills and yearly spending, QR labels, multi-home households, a shareable Home Service Passport and a move-out pack. Next.js 15 (App Router) · React 19 · Neon Postgres + Drizzle · NextAuth · Tailwind (Apple HIG styling). Admin portal included (analytics, users, blog with scheduling, appliance brands, **branding** — upload your own logo, app icon and share image — errors, audit log, site config).

## Features
| Area | What it does |
|---|---|
| Assets | Make/model/serial, install and warranty dates, photos, receipt + manual storage (private), receipt scanning, 150+ brand logos (admin-managed), QR labels |
| Maintenance | Climate-aware seasonal checklists (tropical / temperate), recurring tasks, assignment to household members, personal calendar feed (`.ics`) |
| Reminders | One daily digest by **e-mail** and/or **push notification** (per device); tasks, warranties and expiring documents. WhatsApp: *coming soon* (see below) |
| Records | Document vault with expiry dates, contractors book (one contractor can cover several homes), utility bills with spike warnings, yearly spending report (CSV) |
| Sharing | Home Service Passport (read-only link, off by default, optional password), owner/admin-only move-out pack (zip + printable summary) |
| Welcome tour | Seven-slide first-run tour of every feature; replayable from Settings |
| Homes & people | Many homes per user (icon switcher, searchable when you have more than four), invite links, owner/admin/member roles |
| Help centre | Public FAQ at `/faq` (8 topics, one page per question, FAQPage + breadcrumb structured data, in the sitemap) and the same content in the app under Help & FAQ; edit it in `src/lib/faq-data.ts` |
| Blog & branding | Public blog with scheduled publishing and SEO checks, admin menu for posts; admin can upload their own logo, app icon and share image (Admin → Branding) |
| Account | E-mail + password, 2FA, optional Google / Apple sign-in, data export and account deletion |

## Reminder channels
| Channel | Status | Setup |
|---|---|---|
| E-mail | Live | `RESEND_API_KEY`, `EMAIL_FROM` — users switch it on in Settings |
| Push notifications | Live | Generate keys with `npx web-push generate-vapid-keys`, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Users turn it on per device in Settings (iPhone/iPad: add Wodejia to the Home Screen first) |
| WhatsApp | **Coming soon** — built but switched off | Needs a Meta WhatsApp Business account and two approved templates. The Settings card shows "Coming soon" and no numbers are collected until `WHATSAPP_ENABLED=1` and the credentials below are set |

Messaging options being considered next: a **Telegram** bot (free, no business verification) and optional **SMS** (paid per message). The digest code is channel-neutral (`src/lib/digest-core.ts`, `src/lib/reminders.ts`), so another channel is one more sender.

## Local development
```bash
cp .env.example .env.local   # fill in values
npm install
npm run db:migrate           # applies ./drizzle to DATABASE_URL
npm run dev
```

## Environment variables
| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string (set by the Vercel–Neon integration) |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | yes | Session signing / canonical URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional (Google button appears only when both set) | OAuth redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google` |
| `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | optional (Apple button appears only when all four set) | Sign in with Apple. `APPLE_ID` is the **Services ID**; `APPLE_PRIVATE_KEY` is the `.p8` file contents. Return URL: `<NEXTAUTH_URL>/api/auth/callback/apple`. Optional `APPLE_DOMAIN_ASSOCIATION` = contents of Apple's domain-verification file (served at `/.well-known/apple-developer-domainassociation.txt`). |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional | Free Cloudflare Turnstile CAPTCHA on register / forgot-password, and on login after repeated failures. Off when unset. Rate limiting works regardless. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional | Web Push notifications (turned on per device in Settings). Generate the pair with `npx web-push generate-vapid-keys`; `VAPID_SUBJECT` is `mailto:you@yourdomain`. |
| `WHATSAPP_ENABLED`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | optional — **coming soon, off by default** | WhatsApp reminders via the Meta WhatsApp Business **Cloud API**. Does nothing unless `WHATSAPP_ENABLED=1` *and* the token and phone number ID (permanent system-user token) are set. Needs two approved message templates, each with **one** body variable: `wodejia_code` (category *Authentication*, e.g. "Your Wodejia verification code is {{1}}") and `wodejia_reminder` (category *Utility*, body just `{{1}}`). Names can be changed with `WHATSAPP_CODE_TEMPLATE` / `WHATSAPP_REMINDER_TEMPLATE`; language with `WHATSAPP_LANG` (default `en`). |
| `ADMIN_EMAILS` | recommended | Comma-separated emails promoted to admin on sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes (recommended) | Sends account-confirmation, forgot-password and reminder e-mails. Verify your sending domain in Resend; `EMAIL_FROM` must use it. Without it, sign-up works without e-mail confirmation and admin promotion/reset/reminders are unavailable. |
| `CRON_SECRET` | for reminders | Authorises the daily `/api/cron/reminders` Vercel Cron job |
| `STRIPE_SECRET_KEY` | optional | Turns on the public `/support` "Buy me a coffee" page (Stripe Checkout, 1–500 in the configured currency). Use a restricted key with *Checkout Sessions: write*. `STRIPE_CURRENCY` (e.g. `SGD`; default `USD`) drives both the page and the checkout |
| `DONATE_URL` | optional | Instead of the key: an `https://` Stripe Payment Link to redirect donors to |
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | optional | File storage (Vercel Blob; created by connecting a store). Stores are private: receipts/manuals are only served to signed-in household members, brand logos via a public proxy. Check it in Admin → Site config → Test file storage. |
| `ANTHROPIC_API_KEY` | optional | Receipt OCR (`/api/ocr`) |

## Deployment (production only)
`.github/workflows/deploy.yml` runs on push to `main`: typecheck → `vercel deploy --prod` (build happens on Vercel, where `npm run vercel-build` applies DB migrations, then builds) → health check → `scripts/cleanup-deployments.mjs` deletes every other deployment. `vercel.json` disables Git-triggered (preview) deployments.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new SQL in `drizzle/`.

## Authentication
E-mail + password (min. 12 characters, scrypt-hashed), optional TOTP two-factor with recovery codes, forgot-password by e-mail, lockout after 5 failed attempts, and session revocation on password change. Google and Apple sign-in are optional. `ADMIN_EMAILS` are promoted to admin only once their e-mail is verified. Home Passports can be password-protected.

## Quality checks
`npm run typecheck`, `npm test` (Vitest unit tests for password/2FA/crypto, dates and scheduling, brands, donations) and `npm run build` run on every pull request (`.github/workflows/ci.yml`) and again before every production deploy. A weekly workflow audits production dependencies for high-severity advisories.

### Browser end-to-end suites (`e2e/`)
Playwright suites that drive the real app against a throw-away local Postgres, with fake Resend, Turnstile, WhatsApp and push-service servers:

```bash
# needs a local Postgres (default postgresql://postgres@localhost:5544; override with E2E_DB_URL / E2E_ADMIN_URL)
bash e2e/run.sh            # every suite, each phase on a freshly migrated database
bash e2e/run.sh rel4 side  # only some suites
```

The runner temporarily swaps `src/db/index.ts` for a plain `pg` connection and restores it on exit; results per suite are kept in `e2e/out/`. They are not part of CI because they need that database.
