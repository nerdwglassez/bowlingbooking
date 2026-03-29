# Security notes

Operational practices and what this codebase enforces by default.

## Transport and browser headers

Production responses include **Strict-Transport-Security** (HSTS) via [`next.config.js`](../next.config.js) when `NODE_ENV=production`. All environments get **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy**, **Permissions-Policy**, and **X-DNS-Prefetch-Control: off**.

**Content-Security-Policy** is not set globally: Stripe Elements and third-party scripts need a tailored policy per deployment. If you add CSP, test checkout and staff flows end-to-end.

## Session cookie

The session cookie name and flags are centralized in [`lib/session-cookie.ts`](../lib/session-cookie.ts): **HttpOnly**, **Secure** in production, **SameSite=Lax**, path `/`. Use this module for any new login/session paths so flags stay consistent.

## Rate limiting

[`lib/rate-limit.ts`](../lib/rate-limit.ts) uses an **in-memory** store. It limits abuse per running server instance; on **serverless** with many cold instances, effective limits are looser until you add a shared store (e.g. Redis / Upstash) or an edge rate limiter (e.g. Vercel Firewall, Cloudflare).

Endpoints that apply limits include auth (login, register, forgot/reset password, guest register), kiosk, gift-card validation, API keys, and (for booking abuse) availability, booking creation, profile (`/api/auth/me`), discount preview, Stripe payment-intent create/confirm, and gift-card purchase/confirm.

## Secrets and automation

- Never commit real `.env` values; use [`.env.example`](../.env.example) as the template.
- Cron routes (e.g. [`app/api/cron/send-reminders/route.ts`](../app/api/cron/send-reminders/route.ts)) require **CRON_SECRET**; keep it long and random.
- Rotate database URLs and Stripe keys if exposed.

## Application data access

- **Prisma** parameterized queries reduce SQL injection risk; keep validating inputs with **Zod** (or equivalent) on every write path.
- **Staff/admin** pages should continue to enforce roles server-side (layouts + API), not only in the UI.

## Ongoing hygiene

- Run `npm audit` and upgrade patched dependencies regularly.
- Review [`PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md`](PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md) for a broader checklist.
