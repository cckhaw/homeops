# Security policy

Thank you for helping keep Wodejia and its users safe.

## Reporting a vulnerability

Please report it **privately**, not in a public issue or pull request:

1. Open **Security → Report a vulnerability** on this repository
   (<https://github.com/cckhaw/homeops/security/advisories/new>). This creates a private advisory only the maintainers can see.
2. Describe what you found, how to reproduce it, and the impact you think it has. A short proof of concept helps.
3. Do not access, change or delete other people's data, and do not run denial-of-service or automated scanning against the live site.

We aim to acknowledge a report within 3 working days, give you an assessment within 10, and fix confirmed issues as quickly as their severity warrants. We will credit you in the advisory if you wish.

## Scope

In scope: the Wodejia web app and API (`wodejia.khaw.cc`), including sign-in, sessions, file access, sharing links (Home Service Passport, calendar feed), the admin portal, and the demo.

Out of scope: social engineering, physical attacks, issues in third-party services (Vercel, Neon, Cloudflare, Resend, Stripe), missing best-practice headers on non-sensitive static assets, and reports from automated tools without a demonstrated impact.

## What is already in place

- Passwords hashed with scrypt (per-user salt, cost stored in the hash and upgraded at sign-in), lockout and per-address rate limits, optional two-factor (TOTP with replay protection, single-use recovery codes), session revocation on password change.
- Security headers on every response (HSTS, Content-Security-Policy with `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy).
- Uploads are identified from their content, not the type the browser reports; stored files are private and served through authorised routes with a sandboxing policy.
- Weekly dependency audit and a pinned CI toolchain (GitHub Actions pinned to commit SHAs).

## Supported versions

Only the current production release (the `main` branch) is supported.
