# Performance & Security Review Plan

A structured plan to review the bowling reservation system for **performance** and **security**, and to run standard safety checks. Use this as a checklist and runbook.

---

## Part 1: Performance Review

### 1.1 Build & Bundle

| Task | What to do | Notes |
|------|------------|--------|
| **Production build** | Run `npm run build` and fix any errors or warnings. | Ensures tree-shaking and minification; catch large chunks. |
| **Bundle analysis** | Add `@next/bundle-analyzer` (or use `npx @next/bundle-analyzer` with `ANALYZE=true npm run build` if wired). | Identify heavy dependencies (e.g. Stripe, date-fns, qrcode); consider dynamic imports for above-the-fold. |
| **Duplicate deps** | Run `npm ls` and check for duplicate React or Next. | Overrides in package.json can hide issues. |
| **Unused code** | Run `npx depcheck` (optional). | Find unused dependencies to remove. |

### 1.2 Next.js & React

| Task | What to do | Notes |
|------|------------|--------|
| **React Strict Mode** | Confirm `reactStrictMode: true` in `next.config.js`. | Already set; helps catch side effects. |
| **Client boundaries** | Ensure `'use client'` only where needed (forms, hooks, browser APIs). | Server components by default keep bundles smaller. |
| **Dynamic imports** | Lazy-load heavy or below-fold UI (e.g. Stripe Elements, modals, admin pages). | `next/dynamic` with `ssr: false` for client-only widgets. |
| **Fonts** | Review `next/font` usage (Inter, Righteous); avoid layout shift. | Already used; verify `display: swap` and preload. |
| **Images** | Use `next/image` for all user/content images; set `sizes` and `priority` for LCP. | Package images in admin: optimize and use Image component. |

### 1.3 Data & API

| Task | What to do | Notes |
|------|------------|--------|
| **DB queries** | Audit Prisma usage: avoid N+1, use `select`/`include` only needed fields. | Check staff bookings list, booking detail, availability. |
| **Caching** | Add `revalidate` or `fetch` cache where appropriate for public data (e.g. packages, pricing). | Availability is dynamic; packages/settings can be cached short TTL. |
| **API response size** | Ensure list endpoints don’t over-fetch (e.g. bookings without full nested user). | Paginate or limit where relevant. |
| **Connection pooling** | Confirm Neon (or DB) connection pooling for serverless (e.g. Prisma + Neon pooler). | Use pooled URL in production. |

### 1.4 Front-End Performance

| Task | What to do | Notes |
|------|------------|--------|
| **Core Web Vitals** | Run Lighthouse (Chrome DevTools or CI) on key routes: `/`, `/book`, `/bookings`, `/staff`. | Target LCP &lt; 2.5s, FID/INP &lt; 100ms, CLS &lt; 0.1. |
| **Largest Contentful Paint** | Optimize LCP: hero text, booking header, first card. | Fonts and above-fold images are common culprits. |
| **Cumulative Layout Shift** | Reserve space for images and async content; avoid injecting content above existing UI. | Booking summary sidebar and modals: fixed dimensions or skeleton. |
| **Long tasks** | Reduce main-thread work on `/book` (large page): split state, memoize heavy computations. | Consider `useMemo` for breakdown/price calculations. |
| **Third-party scripts** | Lazy-load Stripe.js only when user reaches step 4 or payment. | Already loaded per route; confirm no blocking script in layout. |

### 1.5 Runtime & Hosting

| Task | What to do | Notes |
|------|------------|--------|
| **Logging** | Avoid `console.log` in production; use a logger that can be disabled or sampled. | Reduces I/O and log volume. |
| **Env at build** | Ensure `NODE_ENV=production` and no dev-only code paths in production build. | Next handles this; verify no `localhost` fallbacks in prod. |
| **Cold starts** | If serverless, keep server dependencies minimal; consider edge for simple routes. | Prisma on serverless can add cold-start; connection pool helps. |

---

## Part 2: Security Review & Tests

### 2.1 Authentication & Sessions

| Task | What to do | Notes |
|------|------------|--------|
| **Session cookie** | Verify `session_token` is `HttpOnly`, `Secure` in production, `SameSite=Lax` (or Strict). | Check `lib/auth.ts` and all `cookies().set()` calls (login, register, guest-register, 2FA). |
| **Session expiry** | Confirm sessions expire and are invalidated on logout and password change. | Already 30-day expiry; ensure logout deletes session in DB. |
| **Password hashing** | Confirm bcrypt with cost ≥ 12. | Already in `lib/auth.ts`. |
| **Role checks** | Every staff/admin API must call `requireAuth('STAFF')` or `requireAuth('ADMIN')`; no client-only checks. | Grep for `requireAuth` and ensure all protected routes use it. |
| **Password reset** | Token single-use, short TTL, stored hashed; no user enumeration in error messages. | Review `forgot-password` and `reset-password` routes. |

### 2.2 Headers & HTTPS

| Task | What to do | Notes |
|------|------------|--------|
| **Security headers** | Add in `next.config.js` or middleware: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. | Reduces clickjacking and MIME sniffing. |
| **CSP** | Consider Content-Security-Policy (report-only first) to restrict script/style sources. | Stripe and Next require allowlisting; tune gradually. |
| **HTTPS** | Enforce HTTPS in production; no mixed content. | Host (Vercel, etc.) usually handles redirect. |
| **HSTS** | Enable Strict-Transport-Security on the host or via headers. | Optional but recommended for production. |

### 2.3 Input & Injection

| Task | What to do | Notes |
|------|------------|--------|
| **Validation** | All API inputs validated with Zod (or equivalent); reject unknown keys where appropriate. | Already using Zod in many routes; ensure every POST/PUT body is validated. |
| **SQL injection** | Prisma parameterizes queries; avoid raw queries with string interpolation. | Grep for `prisma.$queryRaw` and `$executeRaw`; ensure parameterized. |
| **XSS** | React escapes by default; avoid `dangerouslySetInnerHTML` unless sanitized. | Grep for `dangerouslySetInnerHTML`. |
| **IDOR** | Every resource access must check ownership or role (e.g. booking by id: user owns it or is staff). | Review `/api/bookings/[id]`, `/api/staff/*`, customer data access. |

### 2.4 Rate Limiting & Abuse

| Task | What to do | Notes |
|------|------------|--------|
| **Auth endpoints** | Login, register, forgot-password, guest-register rate limited by IP. | Login has rate limit; extend to register, forgot-password, guest-register. |
| **Sensitive APIs** | Gift card validate, kiosk, cron (by secret) protected. | Already rate limited where grep found; add for password reset and registration. |
| **Global API limit** | Optional: middleware or gateway rate limit per IP for `/api/*`. | Prevents brute force and DoS; in-memory limit is per-instance. |
| **Cron secrecy** | Cron routes must require `CRON_SECRET` or equivalent; no public access. | Verify `send-reminders` and `marketing-automation` check secret. |

### 2.5 Secrets & Configuration

| Task | What to do | Notes |
|------|------------|--------|
| **Env vars** | No secrets in repo; `.env` and `.env.local` in `.gitignore`; production secrets in host env only. | Already in .gitignore. |
| **Stripe** | Use publishable key only in client; secret and webhook secret server-side only; verify webhook signatures. | Grep for `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE`; confirm webhook verification. |
| **Database** | Use pooled connection string in production; restrict DB user permissions to what app needs. | Neon pooler URL in production. |
| **Resend / Twilio / Mailchimp** | API keys only in server env; never in client bundle. | Already server-side. |

### 2.6 Dependencies

| Task | What to do | Notes |
|------|------------|--------|
| **Vulnerabilities** | Run `npm audit` and fix high/critical; review moderate. | Run regularly; use `npm audit fix` with care. |
| **Outdated** | Run `npm outdated`; plan upgrades for Next, React, Prisma, Stripe. | Stay within supported versions. |
| **Lockfile** | Commit `package-lock.json`; use exact or range per policy. | Reproducible installs. |

### 2.7 Payment & PII

| Task | What to do | Notes |
|------|------------|--------|
| **Stripe** | No card data in app; use Stripe Elements and Payment Intents; confirm idempotency where needed. | Already using Stripe server-side for intents. |
| **PII** | Minimize logging of email, phone, names; mask in audit logs if stored. | Review audit log and error logging. |
| **PCI** | Rely on Stripe for card handling; no storage of card numbers or CVV. | No card data in DB or logs. |

---

## Part 3: Running the Checks

### 3.1 One-Off Commands

```bash
# From bowling-reservation-system/

# Build (performance: catch bundle and build errors)
npm run build

# Security: dependency audit
npm audit

# Optional: dependency check
npx depcheck
```

### 3.2 Manual Checklist (Performance)

- [ ] Run Lighthouse on `/`, `/book`, `/staff`, `/bookings` (mobile + desktop).
- [ ] Check Network tab: no unnecessary large responses; APIs return only needed fields.
- [ ] Confirm booking flow step transitions are smooth (no long freezes).
- [ ] Verify images use `next/image` and have reasonable dimensions.

### 3.3 Manual Checklist (Security)

- [ ] All protected API routes call `requireAuth` (or equivalent) and check role.
- [ ] Session cookie has HttpOnly, Secure (in prod), SameSite.
- [ ] Login, register, forgot-password, guest-register have rate limiting.
- [ ] No `dangerouslySetInnerHTML` without sanitization.
- [ ] Security headers added (X-Frame-Options, X-Content-Type-Options, etc.).
- [ ] Stripe webhook signature verified in webhook handler (if used).
- [ ] Cron endpoints require secret; not callable without it.

### 3.4 Optional Automation

- **CI:** Add `npm run build` and `npm audit --audit-level=high` to GitHub Actions (or other CI). Fail on high/critical.
- **Lighthouse CI:** Add Lighthouse to CI for key URLs and enforce LCP/FID/CLS budgets.
- **SAST:** Use `npm audit` and optionally a static security scanner (e.g. Snyk, Dependabot) for dependencies.

---

## Part 4: Priority Order

**Quick wins (do first):**

1. Run `npm audit` and fix high/critical.
2. Run `npm run build` and fix any errors.
3. Add security headers in `next.config.js` or middleware.
4. Extend rate limiting to register, forgot-password, guest-register.

**Next:**

5. Lighthouse on main flows; fix LCP and CLS.
6. Audit Prisma usage for N+1 and over-fetching.
7. Verify all protected APIs use `requireAuth` and IDOR checks.
8. Confirm session cookie flags and Stripe webhook verification.

**Ongoing:**

9. Schedule periodic `npm audit` and dependency updates.
10. Review new API routes and pages for auth, validation, and rate limits.

---

## References

- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security](https://stripe.com/docs/security)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Web Vitals](https://web.dev/vitals/)

---

*Update this plan as the project evolves (e.g. new routes, new dependencies, new hosting).*
