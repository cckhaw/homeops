# Architecture

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS (Apple HIG styling, light/dark) · Neon Postgres with Drizzle ORM · NextAuth (credentials, Google, Apple) · Vercel (hosting, Blob file storage, Cron) · Resend (e-mail) · Web Push (VAPID) · Anthropic API (receipt scanning, only on request). Installable as a PWA (`public/sw.js`, `src/app/manifest.ts`).

## Folder map
| Path | Purpose |
|---|---|
| `src/app/` | Routes (pages, route handlers, server actions `*-actions.ts`) |
| `src/components/` | UI components. `Navbar.tsx` is the signed-in menu, `SiteChrome.tsx` the public header/footer, `Logo.tsx`/`LogoArt.tsx` the logo system |
| `src/lib/` | Server and shared logic. Files ending `-core.ts` are pure (no database) and unit-tested |
| `src/db/` | `schema.ts` (Drizzle tables) and the Neon client |
| `drizzle/` | SQL migrations, applied on every build by `scripts/migrate.mjs` |
| `tests/` | Vitest unit tests |
| `e2e/` | Playwright browser suites and the runner (`e2e/run.sh`) |
| `public/` | Static files: service worker, brand images (`public/brand/`) |
| `scripts/` | `migrate.mjs` (build-time migrations), `cleanup-deployments.mjs` (deletes old Vercel deployments after a deploy) |
| `docs/` | This documentation |

## Routes
**Public (indexable):** `/` landing · `/blog`, `/blog/[slug]`, `/blog/category/[category]`, `/blog/rss.xml` · `/faq`, `/faq/[category]`, `/faq/[category]/[slug]` · `/privacy`, `/terms` · `/register`, `/login` · `/support` (only when donations are configured)

**Public (not indexed):** `/forgot-password`, `/reset-password`, `/join/[token]` (household invite), `/passport/[token]` (shared Home Service Passport), `/support/thanks`

**Signed in (`/dashboard/…`):** home dashboard, `assets` (+ `[id]`, `[id]/label`, `[id]/claim`), `schedule`, `household`, `passport`, `documents`, `contractors`, `bills`, `property` (SG/MY property dates), `reports` (spending), `pack` (move-out pack), `labels` (QR labels), `homes` (switch, edit with the pencil, add), `help` (FAQ in the app), `more` (phone hub), `settings/{profile,appearance,notifications,security,privacy}`

**Admin (`/admin/…`, admins only):** analytics, `users`, `blog` (+ scheduling), `brands` (appliance brand logos), `branding` (site logo, icon, share image), `errors`, `audit`, `settings` (site config)

**Route handlers (`/api/…`):** auth, `ocr` (receipt scan, and `mode=label` for the model sticker), `claim/[assetId]` (warranty claim pack zip), `files/[assetId]/[kind]` and `documents/[id]` (private file proxies), `export`, `pack`, `report`, `calendar/[token]/[file]` (ICS feed), `cron/reminders`, `telegram/webhook`, `donate`, `passport/[id]`, `health/*`. Also `/brand-asset/[kind]` (uploaded logo/icon/share image), `/icons/[size]`, `/favicon.ico`, `/opengraph-image`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`.

## Data model (Postgres, `src/db/schema.ts`)
| Area | Tables |
|---|---|
| People and homes | `profiles`, `households`, `household_members` (owner/admin/member), `household_invites` (7-day links), `login_tokens` (e-mail confirm / reset) |
| Home records | `assets`, `service_records`, `maintenance_tasks`, `task_reminders`, `asset_reminders`, `documents`, `document_reminders`, `utility_bills`, `contractors`, `contractor_homes` (one contractor, several homes) |
| Notifications | `push_subscriptions` (one row per device); Telegram link columns on `profiles` (`telegram_chat_id`, one-time `telegram_link_hash`) |
| Content and branding | `blog_posts` (status + `publish_at` for scheduling), `brand_assets` (uploaded logo/icon/share image, base64), `brands` (appliance brands) |
| Platform | `site_settings` (key/value site config), `rate_limits`, `error_log`, `audit_log` |

## Main flows
- **Access control.** Every signed-in page calls `requireHousehold()`/`requireUser()`; actions re-check the role (`owner`/`admin` manage a home). Admin pages call `requireAdmin()`. Files are served only through proxy routes that check household membership; storage is private.
- **Reminders.** A daily Vercel Cron (`vercel.json`, 13:00 UTC) calls `/api/cron/reminders`. `src/lib/digest-core.ts` builds one channel-neutral digest per user (tasks, warranties, expiring documents), `src/lib/reminders.ts` sends it by e-mail, Web Push and Telegram. WhatsApp is built but off (`WHATSAPP_ENABLED`).
- **Receipt and sticker scanning.** `POST /api/ocr` (`mode=receipt` or `mode=label`) sends the image to Anthropic only when the user presses Scan or Read label, rate-limited per minute and per day. Prompts and result cleaning live in `src/lib/ocr-core.ts` (unit-tested); sticker photos are never stored.
- **Warranty claims.** `src/lib/claim-core.ts` builds the letter from the asset's saved facts (pure, unit-tested); `ClaimBuilder` shows it live; `/api/claim/[assetId]` zips the letter with the saved receipt, manual and photo for members of the home. Nothing is sent by Wodejia.
- **Telegram.** Settings creates a one-time token (only its hash is stored, 15 minutes); the user opens `t.me/<bot>?start=<token>` and presses Start; Telegram calls `/api/telegram/webhook` (checked with the secret header) which links the chat. Messages are sent through `src/lib/telegram.ts`; a chat that blocked the bot is unlinked automatically. Pure helpers (tokens, commands, message text) are in `telegram-core.ts`.
- **Property dates.** `src/lib/property-core.ts` holds the region templates and validation; `addPropertyReminders` turns ticked items into ordinary repeating `maintenance_tasks`, so reminders, calendar feed and Schedule work unchanged.
- **Caching.** Public pages (blog, FAQ, landing) are static or ISR (`revalidate = 60`) and carry no per-visitor data, so the CDN can serve them. Signed-in pages are dynamic. The root layout reads the uploaded logo/icon from the database through a tagged cache that admin changes clear.
- **Theme.** Day/night and accent colour are stored in the browser and applied before first paint (`THEME_INIT_SCRIPT`). The logo turns white in dark mode through CSS variables.
- **Branding.** Admin uploads are validated from the file bytes (`src/lib/brand-core.ts`), stored in `brand_assets` and served from `/brand-asset/[kind]?v=<revision>` with immutable caching. Removing an upload returns to the built-in artwork.
- **Errors and audit.** Server errors are recorded in `error_log` (Admin → Errors); admin and security actions in `audit_log`.
