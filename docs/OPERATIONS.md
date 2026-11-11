# Operations

## Deploying
Production only (no preview deployments). `.github/workflows/deploy.yml` runs on every push to `main`: typecheck and tests, `vercel deploy --prod` (the build runs `npm run vercel-build`: migrations via `scripts/migrate.mjs`, then `next build`), a health check, then `scripts/cleanup-deployments.mjs` removes every older deployment once the new one is live. Pull requests run `ci.yml` (typecheck, unit tests, build). `audit.yml` runs a weekly dependency audit.

Workflow in practice: branch → pull request → CI green → squash merge → watch the *Deploy to Vercel (Production)* run → check the live site.

### Database changes
Edit `src/db/schema.ts`, run `npm run db:generate` (or `npx drizzle-kit generate --custom` for data-only SQL) and commit the new file in `drizzle/`. Migrations run automatically on the next deploy against the Neon database connected to the Vercel project.

## Domains and URLs
- The Vercel project can serve several domains (currently `wodejia.khaw.cc`, `homeops.khaw.cc` and the `*.vercel.app` address).
- **`NEXTAUTH_URL` must be your main domain.** It sets sign-in callbacks, e-mail links, canonical URLs, the sitemap host and share images.
- When the main domain changes, update: `NEXTAUTH_URL`; the Google and Apple sign-in redirect URLs (`<domain>/api/auth/callback/google`, the Apple Services ID return URL and domain verification); the Stripe return URLs if donations are on; **the Cloudflare Turnstile widget's hostname list** (a hostname missing there shows "Unable to connect to website" in the CAPTCHA); and the Resend sending domain (`EMAIL_FROM`) if it changes.
- **Old domain redirect:** requests to `homeops.khaw.cc` are forwarded (308, path and query kept) to the host in `NEXTAUTH_URL` by `src/middleware.ts` (`src/lib/domain-redirect.ts`; the retired host is listed in `OLD_HOSTS` and in the middleware matcher). Nothing is redirected if `NEXTAUTH_URL` is unset or points at the old host, so it cannot loop. Alternatively set the redirect on the domain itself in Vercel (Project → Domains → homeops.khaw.cc → Redirect to wodejia.khaw.cc); once that is in place the code redirect is redundant and can be removed.

## Environment checklist
See the table in the [README](../README.md#environment-variables). Changes to environment variables apply only after a new deployment.

## Setting up Telegram reminders
1. In Telegram, message **@BotFather**, send `/newbot`, and copy the bot token and the bot's username.
2. In Vercel (Production) set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (without the @) and `TELEGRAM_WEBHOOK_SECRET` (any random string of letters, digits, `_` or `-`), then redeploy.
3. Sign in as admin, open **Admin → Site config → Telegram reminders** and press **Register webhook**, then **Check webhook** (it should say healthy). The webhook address comes from `NEXTAUTH_URL`, so that must be your https main domain.
4. As a user: **Settings → Notifications → Connect Telegram**, open the link, press Start, then **Send a test**.
If you change the secret or the domain, press Register webhook again.

## Testing push notifications
1. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (a pair from `npx web-push generate-vapid-keys`) and `VAPID_SUBJECT` (`mailto:…`) for Production, then redeploy. Do not regenerate the pair later or existing devices stop receiving.
2. Sign in, open **Settings → Notifications → Turn on for this device**, allow notifications, press **Send a test**.
3. iPhone/iPad: add the site to the Home Screen first and open it from that icon. Desktop Chrome/Edge/Firefox and Android Chrome work in a tab.
4. The daily digest is sent by the cron at 13:00 UTC to users who have reminders on and something due.

## Browser end-to-end tests
`bash e2e/run.sh [suite …]` (needs a local Postgres on port 5544 and Playwright's Chromium). The runner also starts a fake Anthropic API (port 4060, selected with `OCR_API_BASE_URL`) for the scan tests. The runner starts the app in dev mode against a throw-away database, temporarily replaces `src/db/index.ts` with a plain `pg` connection and restores it when it exits. If a run is interrupted, restore it with `git checkout -- src/db/index.ts` and empty `.env.local`.

| Suite | Covers |
|---|---|
| `auth1`, `auth2`, `auth3`, `legal` | Sign-up, e-mail confirmation, password reset, 2FA, privacy/terms, account deletion |
| `brands`, `e2e2`, `e2e3`, `features`, `adminfeat`, `formkeep` | Assets, locales and currency, admin tools, form behaviour |
| `rel1`, `rel3`–`rel6` | Homes and icons, tour, reports and labels, contractors/documents/bills/pack, push and WhatsApp |
| `layout`, `side`, `rel7`, `landing`, `rel8` | Sidebar, responsive layout on desktop/tablet/phone, landing page, blog and admin menu |
| `rel9` | Admin Branding (upload, validation, apply, reset) |
| `rel10` | Left menu: Dashboard rename, groups, tooltips, edit-home pencil, desktop/tablet/phone fit |
| `rel11` | FAQ pages, structured data, sitemap entries, in-app help, Support section, old-domain redirect |
| `rel12` | Model-sticker scan (against a fake AI server) and the warranty claim helper |
| `rel13` | Telegram: connect link, webhook security, digest delivery, blocked chats, admin webhook setup (fake Telegram server on port 4070) |
| `rel16` | Newsletter sign-up, confirm, admin send and resume, unsubscribe (page, one-click, headers), free tools pages (SEO, all five calculators) and the published articles that link to them |
| `rel17` | Demo mode: admin settings and validation, public card and homepage button, per-visitor sandbox with twelve homes, guard rails, isolation, expiry and clean-up |
| `rel15` | Rentals: tenancies, rent reminders and arrears, mark rent received, condition reports and move-out comparison, access control |
| `rel14` | Property dates for Singapore/Malaysia, and the Telegram card when the bot is not configured |
| `rel2` | Turnstile and Apple sign-in |

Unit tests (`npm test`) cover the pure logic: passwords and crypto, dates, reminders, markdown, blog rules, brand-image validation, FAQ content, sitemap and more.

## Housekeeping
- **Repository name:** the GitHub repository is still called `homeops`. Renaming it (Settings → General) is safe for Vercel but check the deploy workflow's secrets and any hard-coded names first.
- **Browser storage keys** keep their old `homeops-` prefix (theme, sidebar). Renaming them would reset every user's saved preferences, so they stay.

## Demo mode

Admin → Demo: switch it on, choose a demo e-mail and password (8–64 characters; a real account's e-mail is refused) and how long a sandbox lives (default 24 h). Anyone signing in with those credentials gets a private, freshly seeded account ("Alex Tan (Demo)") with twelve homes covering every feature (see `src/lib/demo-core.ts`). Optional "show hint" prints the credentials on the sign-in page and adds a "Try the live demo" button to the homepage. Uploads, OCR scans, notifications, invites, password changes and account deletion are switched off for demo accounts; demo accounts are never e-mailed and are excluded from Admin analytics and Users. Expired sandboxes are removed by the daily reminders cron, or via Admin → Demo (Remove expired / Remove all). At most 150 sandboxes exist at once.
