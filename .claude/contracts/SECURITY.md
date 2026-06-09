# Security contract

Status: active — complements architectural drift checks and CI gates.

## Defense layers

| Layer | Tool | What it catches |
|-------|------|-----------------|
| Architecture chokepoints | `scripts/drift-check.mjs` | Auth/stripe/bcrypt/resend boundaries, layout `requireRole`, secret env in client components |
| Dependency CVEs | `npm run audit` / Dependabot | Known vulnerable packages |
| Types + lint | `tsc`, eslint | Obvious bugs, Next.js conventions |
| Domain tests | Vitest | Auth gating, rate limits, refunds, webhooks |
| AI diff review | `.cursor/skills/security-review/SKILL.md` | Logic bugs greps miss (IDOR, missing validation) |
| Edge | WAF / Vercel Firewall | Abuse volume — see `.claude/contracts/OPS.md` |

**AI review does not replace automated gates.** CI must pass `npm run verify` (includes audit + drift).

## Drift security rules (automated)

Added to `scripts/drift-check.mjs`:

- `dangerouslySetInnerHTML` — XSS surface; use text nodes or sanitized HTML only in allowlisted modules
- `eval(` / `new Function(` — dynamic code execution
- Secret `process.env` reads in `'use client'` files — only `NEXT_PUBLIC_*` and `NODE_ENV` allowed on the client bundle
- Direct `@/lib/prisma` / `@prisma/client` imports in `src/app/**/page.tsx` and route `layout.tsx` — pages use server actions / lib helpers

Existing chokepoint rules (auth, stripe, bcrypt, resend, sentry) remain unchanged.

## npm audit policy

- **Threshold:** `--audit-level=high` (high + critical fail CI)
- **Script:** `npm run audit` → `node scripts/security-audit.mjs`
- **Fix path:** `npm audit fix` when safe; major bumps via Dependabot PR + manual QA

## Manual / AI review checklist

Run `.cursor/skills/security-review/SKILL.md` (or `/security-review`) on every PR that touches:

- `src/lib/actions/**`, `src/app/api/**`, `src/lib/auth.ts`
- Sign-in, password reset, team invite, payment, webhooks
- New public server actions (no auth)

### Auth & authorization

- [ ] Staff/admin mutations call `requireRole` in the action (layout gate is not enough for actions)
- [ ] Customer booking ops verify booking belongs to caller (email, token, or session)
- [ ] Refunds: MANAGER+ only; walk-in manual path uses `manualRefundBookingAction`
- [ ] No new direct `next-auth` / `bcryptjs` / `stripe` / `resend` imports outside chokepoints

### Input validation

- [ ] Server actions validate and bound all `FormData` / JSON inputs (length, format, enums)
- [ ] Monetary values are integer cents; no float money
- [ ] IDs from the client are re-validated server-side (exist, tenant scope, status)

### Public abuse surfaces

- [ ] New unauthenticated endpoints have rate limiting (`assertRateLimit` / edge limits per OPS.md)
- [ ] Promo / lookup / ICS / password-reset paths documented in OPS if added

### Secrets & data

- [ ] No secrets, `.env.local` values, or live keys in diff
- [ ] No PII logged to console in production paths
- [ ] Email HTML uses `escapeHtml` for dynamic content (`src/lib/email.ts`)

### Payments

- [ ] Stripe webhook verifies signature via `@/lib/stripe` `constructWebhookEvent`
- [ ] Booking confirmation only from webhook / verified payment path — never client-only

## When to extend this contract

Add a new drift grep when the same vulnerability class appears twice (e.g. a second SDK imported outside its wrapper). Add a Vitest test when a security rule has non-trivial branching.
