# SEO and discoverability

## What is generated automatically
| File | Source | Notes |
|---|---|---|
| `/sitemap.xml` | `src/app/sitemap.ts` → `buildSitemap()` in `src/lib/site-pages.ts` | Regenerated at most once a minute |
| `/robots.txt` | `src/app/robots.ts` | Allows the public pages, blocks private areas, points to the sitemap |
| `/blog/rss.xml` | `src/app/blog/rss.xml/route.ts` | Published posts only |
| `/manifest.webmanifest` | `src/app/manifest.ts` | PWA install data |

## What the sitemap contains
- **Static public pages** from `PUBLIC_PAGES` in `src/lib/site-pages.ts` (home, blog, FAQ, register, login, privacy, terms, and `/support` only when donations are configured).
- **Blog:** every *published* post and each category that has posts. Drafts and scheduled posts are never listed, and a scheduled post appears about a minute after its publish time.
- **FAQ:** the index, every topic and every question.
- **`lastmod` is the real content date**, so search engines can trust it: a post's last edit; `FAQ_UPDATED` (`src/lib/faq-data.ts`) for the help centre; `LEGAL_UPDATED_ISO` (`src/lib/legal-meta.ts`) for privacy/terms; the build date for the landing, sign-up and sign-in pages; for `/blog` and category pages, the newest post inside them.

## When you add or change things
| You do this | You must also |
|---|---|
| Add a **new public page** (e.g. `/pricing`) | Add one entry to `PUBLIC_PAGES` (sitemap and robots both follow it). Give the page its own `metadata` with a title, description and `alternates.canonical` |
| Add or edit a **blog post** in Admin → Blog | Nothing. Sitemap, RSS and category pages update on their own |
| Edit an **FAQ answer** or add a question | Edit `src/lib/faq-data.ts` and bump `FAQ_UPDATED` to today. The topic page, question page, sitemap and structured data all follow |
| Change the **Privacy Policy or Terms** | Update `LAST_UPDATED` and `LEGAL_UPDATED_ISO` in `src/lib/legal-meta.ts` |
| Add a **private** route | Add its prefix to `PRIVATE_PATHS` in `src/lib/site-pages.ts` (and keep it out of `PUBLIC_PAGES`) |

`npm test` fails if the sitemap lists a duplicate URL, a private path, a page robots would block, or an invalid date.

## Page markup (already in place)
- One `<h1>` per page, a unique `<title>` (template `… · Wodejia`) and a description under 160 characters.
- `alternates.canonical` on every public page; `og:` tags; a default share image at `/opengraph-image` (replaceable in Admin → Branding); per-post share images at `/blog/[slug]/og`.
- Structured data (JSON-LD): `BlogPosting` + `BreadcrumbList` on posts, `Blog` on the blog index, `FAQPage` + `BreadcrumbList` on FAQ topic and question pages, `CollectionPage`/`ItemList` on the FAQ index.
- Descriptive URLs: `/faq/<topic>/<question-slug>`, `/blog/<slug>`, `/blog/category/<category>`.
- The in-app help (`/dashboard/help`) is `noindex`; the public FAQ is the indexable copy.

## After deploying a new domain
`NEXTAUTH_URL` (or `VERCEL_PROJECT_PRODUCTION_URL`) decides the host written into the sitemap, canonical URLs and share images. Set `NEXTAUTH_URL` to your main domain, redeploy, then submit `<domain>/sitemap.xml` in Google Search Console (and Bing Webmaster Tools). Redirect the old domain to the new one in the Vercel domain settings so search engines consolidate on one address.
