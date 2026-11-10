# Content guide

## Blog (Admin → Blog)
- Posts are Markdown (headings, lists, tables, checklists, links, bold/italic, code). The editor shows SEO checks (title and description length, headings, links).
- **Status:** *draft* (private), *published* (public now) or *scheduled* (becomes public by itself at its time). Times are entered in **Singapore / Malaysia time (UTC+8)**.
- A scheduled post goes live about a minute after its time (public pages refresh every 60 seconds); saving a post refreshes the blog, its feed and the sitemap at once.
- Categories: Maintenance, Warranties, Money, Buying & selling, Product updates. Each category with posts gets its own indexable page.
- Starter posts were created by migrations `0011` (the air-con guide, published) and `0012` (rename); the warranty checklist is scheduled for 13 Nov 2026, 09:00 SGT.

## FAQ / help centre
- **Edit in one file:** `src/lib/faq-data.ts`. Each topic has a slug, title, blurb, SEO title and description, and a list of `{ slug, q, a }`. Answers are Markdown (internal links only to `/privacy`, `/terms`, `/register`, `/login`).
- The same data feeds the public pages (`/faq…`), the in-app Help page and the sitemap.
- Rules (checked by `tests/faq.test.ts`): unique URL-safe slugs, titles ≤ 60 characters, descriptions 90–165, questions ≤ 75, valid links, and no promises about features that are not built (e.g. Telegram or SMS).
- After editing answers, bump `FAQ_UPDATED` so the sitemap's `lastmod` is accurate.
- Describe only what the product really does; check against the code or the privacy policy first.

## Newsletter (Admin → Newsletter)
- Write in Markdown (headings, **bold**, links, lists). *Start from the latest blog post* pre-fills subject and a link. *Send me a test* mails only you, through the real template. *Send* goes to confirmed subscribers, up to 300 per press: press again ("Send to the rest") to continue; nobody gets an issue twice.
- Only people who confirmed from their inbox receive it; every e-mail has an unsubscribe link. Needs `RESEND_API_KEY` and a verified sending domain (`EMAIL_FROM`); check your Resend plan's daily and per-second limits before large sends.

## Free tools
The air-con price ranges, usage assumptions and appliance lifespans are in `src/lib/tools-core.ts` as plain tables. They are indicative 2026 market ranges and rules of thumb: review them once or twice a year, update the numbers and the matching FAQ text on the page, and the unit tests will tell you if a change breaks the maths.

## Welcome tour
`src/components/WelcomeTour.tsx` (`SLIDES`). Shown once after first sign-in; replayable from Settings → Profile. Keep it to a handful of slides and update it when a major feature ships.

## Branding (Admin → Branding)
| Item | Accepted | Used for |
|---|---|---|
| Logo | PNG, SVG or WebP, ≤ 1 MB | Full logo in headers, footers, sign-in and the app menu |
| Icon | Square PNG, 512–2048 px, ≤ 1 MB | Favicon (`/favicon.ico`, tab icon), home-screen and app icons, small logo in the collapsed menu |
| Social share image | PNG, ≥ 1200×630 (about 1.9:1), ≤ 1.5 MB | Default preview when pages are shared (`/opengraph-image`, `/twitter-image`) |

Files are checked from their bytes (not their names); SVGs with scripts, event handlers or external links are rejected. *Reset to default* restores the built-in artwork. Blog and passport share cards still use the built-in mark. Source artwork lives in `public/brand/`: icon, transparent and white versions, a horizontal logo and a square logo (white or transparent).

## Legal pages
`/privacy` and `/terms` are written for the current feature set. After a feature that changes data handling (new provider, new data collected) update both and then `src/lib/legal-meta.ts` (see [SEO](SEO.md)). Have the wording reviewed by a qualified person before relying on it.

## Appearance rules worth knowing
- Default accent is the logo navy (`#1F3A6B`); in dark mode the logo is fully white and the accent is a lighter blue for contrast.
- The public header on phones narrower than 420 px shows only the logo symbol so it never overflows.
