# HomeOps

Mobile-first PWA: a digital passport for home assets, seasonal maintenance, receipt OCR, multi-user households, Google sign-in, a shareable Home Service Passport and an admin portal. Next.js 14 (App Router) · Neon Postgres + Drizzle · NextAuth (Google + magic link) · Tailwind (Apple HIG styling).

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
| `ADMIN_EMAILS` | recommended | Comma-separated emails promoted to admin on sign-in |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes (recommended) | Sends account-confirmation, forgot-password and reminder e-mails. Verify your sending domain in Resend; `EMAIL_FROM` must use it. Without it, sign-up works without e-mail confirmation and admin promotion/reset/reminders are unavailable. |
| `CRON_SECRET` | for reminders | Authorises the daily `/api/cron/reminders` Vercel Cron job |
| `STRIPE_SECRET_KEY` | optional | Turns on the public `/support` "Buy me a coffee" page (Stripe Checkout, $1–$500). Use a restricted key with *Checkout Sessions: write*. `STRIPE_CURRENCY` (default `usd`) |
| `DONATE_URL` | optional | Instead of the key: an `https://` Stripe Payment Link to redirect donors to |
| `BLOB_STORE_ID` / `BLOB_READ_WRITE_TOKEN` | optional | File storage (Vercel Blob; created by connecting a store). Stores are private: receipts/manuals are only served to signed-in household members, brand logos via a public proxy. Check it in Admin → Site config → Test file storage. |
| `ANTHROPIC_API_KEY` | optional | Receipt OCR (`/api/ocr`) |

## Deployment (production only)
`.github/workflows/deploy.yml` runs on push to `main`: typecheck → `vercel deploy --prod` (build happens on Vercel, where `npm run vercel-build` applies DB migrations, then builds) → health check → `scripts/cleanup-deployments.mjs` deletes every other deployment. `vercel.json` disables Git-triggered (preview) deployments.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new SQL in `drizzle/`.

Note: uploaded files use Vercel Blob public URLs (unguessable, but not access-controlled).

## Authentication
E-mail + password (min. 12 characters, scrypt-hashed), optional TOTP two-factor with recovery codes, forgot-password by e-mail, lockout after 5 failed attempts, and session revocation on password change. Google sign-in is optional. `ADMIN_EMAILS` are promoted to admin only once their e-mail is verified. Home Passports can be password-protected.

## Quality checks
`npm run typecheck`, `npm test` (Vitest unit tests for password/2FA/crypto, dates and scheduling, brands, donations) and `npm run build` run on every pull request (`.github/workflows/ci.yml`) and again before every production deploy. A weekly workflow audits production dependencies for high-severity advisories.

### Browser end-to-end suites (`e2e/`)
Playwright suites that drive the real app against a throw-away local Postgres, with fake Resend and Turnstile servers:

```bash
# needs a local Postgres (default postgresql://postgres@localhost:5544; override with E2E_DB_URL / E2E_ADMIN_URL)
bash e2e/run.sh            # every suite, each phase on a freshly migrated database
bash e2e/run.sh rel4 side  # only some suites
```

The runner temporarily swaps `src/db/index.ts` for a plain `pg` connection and restores it on exit; results per suite are kept in `e2e/out/`. They are not part of CI because they need that database.
