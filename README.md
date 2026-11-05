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
