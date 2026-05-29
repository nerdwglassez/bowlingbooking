# STACK_BASELINE.md
# Frozen stack decisions for Royal Z Lanes

> Status: **decisions locked** (2026-05-11). Implementation details (e.g., Next 16 API cheat sheet) are filled in by the Infra agent in Phase 0 after reading `node_modules/next/dist/docs/`. Do not change values in this file without going back through `.cursor/AGENTS.md` § 10 "Pre-launch decisions."

Every downstream agent reads this file first. It is the single source of truth for stack-level choices.

---

## 1. Tailwind — v4 (CSS-first config)

- **Choice:** `tailwindcss@^4` with `@tailwindcss/postcss@^4` (as installed).
- **Configuration model:** CSS-first via `@theme` directives. Keep `tailwind.config.ts` for the `content` glob and `theme.extend.screens`/`maxWidth` only; **delete the v3-only `corePlugins: { backgroundColor: false }` block** — it is a no-op in v4.
- **Color guardrail replacement:** the drift sentinel (see `.cursor/AGENTS.md` § 6) enforces "no Tailwind color utilities" at lint time, plus an ESLint rule banning `/(bg|text|border|ring|outline|placeholder|caret|accent|fill|stroke)-(amber|stone|red|green|blue|purple|zinc|slate|gray|neutral)-[0-9]+/`.
- **`globals.css` shape (Infra agent target):**
  ```css
  @import "tailwindcss";
  @import "../styles/tokens.css";
  @import "../styles/themes/default.css";

  body {
    background: var(--surface-ground);
    color: var(--color-text-primary);
    font-family: var(--font-body);
  }
  ```
- **Tailwind allowed for:** layout (`flex`, `grid`, `gap`, `p-*`, `m-*`, `w-*`, `h-*`, positioning, overflow, sizing).
- **Tailwind forbidden for:** color, typography color, the `dark:` prefix (data-theme handles both modes).

## 2. Framework — Next.js 16 + React 19

- **Choice:** `next@16.2.6`, `react@19.2.4`, `react-dom@19.2.4` (as installed).
- **Critical:** training data predates Next 16. Every agent MUST read `node_modules/next/dist/docs/` before touching App Router code.
- **Infra agent deliverable (Phase 0):** a "Next 16 differences" section in this file (see § 7 below) summarizing:
  - Async `params`, `searchParams`, `headers()`, `cookies()`
  - Server Component / Client Component boundary changes
  - Caching default behavior (route segment opts in, not out)
  - Turbopack defaults (`next dev --turbopack`, `next build --turbopack` already in `package.json`)
  - Removed / renamed APIs (`next/legacy/image`, etc.)
- **React 19 features in scope:** server actions, `useActionState`, `useFormStatus`, `use()` — all preferred over manual fetch+state for the booking 4-step flow.

## 3. Auth — NextAuth v5 (Auth.js)

- **Choice:** `next-auth@^5` (a.k.a. Auth.js), required for React 19. Decisions locked in Phase 6a.
- **Session strategy:** **JWT, 24 h max age.** Token embeds `id`, `role`, and `tenantId`. No Prisma adapter today — switching to database sessions is a one-line edit in `src/lib/auth.ts` if/when instant revocation is needed.
- **Provider(s):** **Credentials only.** Email + password, verified against `User.passwordHash` (bcryptjs, cost 12). OAuth and email magic-link explicitly deferred.
- **Customer accounts:** **none in v1.** The booking flow is guest-first; only STAFF / MANAGER / ADMIN authenticate. Customer-facing accounts are a later, distinct surface.
- **Password storage:** `User.passwordHash` (nullable) — bcryptjs hash. Hashing function lives only in `src/lib/auth.ts` (`hashPassword`).
- **Sign-in surface:** `/signin` (shared between staff and admin). `?from=…` query param drives post-login redirect.
- **Wrapper rule:** all consumers go through `src/lib/auth.ts`. The drift sentinel rejects any direct `import` of `next-auth`, `next-auth/providers/*`, `next-auth/jwt`, or `bcryptjs` from anywhere else (one exception: `prisma/seed.ts` may import `bcryptjs` because the seed runs out-of-band of the app).
- **Helpers exported from `lib/auth.ts`:**
  - `auth()` — Auth.js helper. Usable in Server Components, route handlers, `proxy.ts`.
  - `signIn()`, `signOut()` — NextAuth APIs, exported for use in Server Actions only.
  - `verifyCredentials(email, password)` — email/password check used by the Credentials provider's `authorize`.
  - `hashPassword(plaintext)` — bcryptjs wrapper for seed scripts and admin tooling.
  - `getCurrentUser()` — `CurrentUser | null` from the session JWT; no DB read.
  - `requireUser(currentPath?)` — redirects to `/signin?from=…` if unauthenticated.
  - `requireRole(...allowed)` — redirects to `/signin` if unauthenticated; calls `unauthorized()` if the role isn't allowed.
- **Role checks:** server-side only. **Never** trust a client-side role claim. STAFF cannot refund; MANAGER and ADMIN can. See `.claude/BOOKING_DOMAIN.md` § "Refund rules".
- **Dev-without-DB:** auth REQUIRES a real `DATABASE_URL`. The customer booking flow's mock fallback (§9.1) does **not** cover auth — `requireUser`/`requireRole` will surface Prisma errors when the DB is missing. Agents building staff/admin must run real Postgres locally.
- **Full contract:** `.claude/contracts/AUTH.md` — every page that gates by role, calls `signIn/signOut`, or reads `getCurrentUser` follows that file.

## 4. Money — integer cents

- **Choice:** store all monetary values as `Int` cents in Postgres. No `Decimal` columns anywhere.
- **Schema migration (Domain agent, Phase 3):**
  - `Package.basePrice`, `Package.gameCostPer`, `Package.shoeCostPer` → `Int`
  - `Booking.totalAmount` → `Int`
  - `Payment.amount`, `Payment.refundAmount` → `Int`
- **Type contract:** `src/types/index.ts` already declares these as `number`. After migration the types are correct as-is.
- **Pricing arithmetic:** `src/lib/pricing.ts` uses plain JS `+` and `*` on integers — no `Decimal.js`, no `Prisma.Decimal`. Existing helpers (`calculatePrice`, `formatPrice`) need `formatPrice` updated to divide by 100 at the display boundary.
- **Stripe boundary:** Stripe's API natively uses cents (`amount: 4500` = $45.00). Pass values straight through; no conversion.
- **Form input boundary:** admin settings UI accepts dollars (e.g., "45.00"), converts to cents at submit. Place this conversion inside `lib/pricing.ts` (one function: `dollarsToCents(input: string): number`).

## 5. Tenant — single-tenant launch with `DEFAULT_TENANT_SLUG`

- **Choice:** ship single-tenant for the Royal Z Lanes MVP. The multi-tenant schema stays intact.
- **Identification mechanism:** environment variable.
  - Add to `.env.example`: `DEFAULT_TENANT_SLUG="royalz"`.
  - `src/lib/tenant.ts` `getTenant()` reads `process.env.DEFAULT_TENANT_SLUG`, queries DB by slug, caches the result for the request lifetime.
- **URL shape:** clean — `/book/step1`, `/staff`, `/admin/settings`. No `/[tenant]` segment.
- **Page rule:** pages always call `getTenant()`. Never hardcode "Royal Z Lanes", the address, the phone number, or brand colors anywhere in components or pages. Drift sentinel greps for the literal strings `"Royal Z Lanes"`, `"royalzlanes"`, and the venue phone/address as a smoke test.
- **Future migration to subdomains:** when tenant #2 arrives, rewrite `getTenant()` to read `host` from `headers()` and look up by slug derived from the subdomain. No page or component changes required — that's the SaaS validation step in Phase 6.
- **Phase 6 canary test:** create a `kingpin-lanes` second tenant via seed + theme file (`src/styles/themes/kingpin-lanes.css` with 4 token overrides) and verify a different DEFAULT_TENANT_SLUG renders the entire app rebranded with zero source-file changes elsewhere.

## 6. Button primitive — best-of-n-runner N=3, then single-pass

- **Choice:** launch the Button primitive (Phase 2's first agent) via `Task(subagent_type="best-of-n-runner")` with N=3 isolated worktrees. The other 6 primitives use plain `generalPurpose` agents that follow Button's chosen pattern.
- **Constrained strategies for the three attempts:**
  1. **CVA (`class-variance-authority`) variants** — declarative variant map, Tailwind utilities for layout, CSS variables for color.
  2. **Pure variant function** — `getButtonStyles(variant, size)` returning inline `style={}` object built from CSS variables. No external dep.
  3. **Headless + Radix Slot** — `@radix-ui/react-slot` for `asChild`, plus a small variant function. Matches shadcn/ui idioms.
- **Selection criteria (orchestrator evaluates):**
  - Token purity (zero `var(--palette-*)`, zero hex, zero color utility classes)
  - Prop ergonomics for downstream agents
  - Bundle size impact
  - How well the same pattern scales to Card, Badge, Input, Select, Checkbox, Toggle
- **Output:** the winning Button is copied into `src/components/ui/button.tsx`. The pattern is recorded in `.claude/contracts/PRIMITIVES.md` as the canonical strategy. The other primitives' prompts reference that file.

---

## 7. Next 16 differences cheat sheet

> Source: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` (Next 16.2.6). All items below are verified against the bundled docs, not training-data memory.

### Async Request APIs — BREAKING (now fully removed sync access)

All of these are Promises in Next 16. v15 had a temporary sync compatibility window; v16 removed it.

- `cookies()` — `const c = await cookies()`
- `headers()` — `const h = await headers()`
- `draftMode()` — `const d = await draftMode()`
- `params` in `layout.js`, `page.js`, `route.js`, `default.js`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon`
- `searchParams` in `page.js`

**Canonical page signature:**
```tsx
export default async function Page(props: PageProps<'/booking/[id]'>) {
  const { id } = await props.params
  const query = await props.searchParams
  // ...
}
```

`PageProps<route>`, `LayoutProps<route>`, `RouteContext<route>` are global type helpers generated by `npx next typegen` (introduced in 15.5). Run typegen once to get them; downstream agents must use them rather than handwriting param shapes.

### Route handlers

- File: `app/**/route.ts`. Exports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. Unsupported methods → 405.
- **Not cached by default.** To cache a `GET`, set `export const dynamic = 'force-static'`.
- Web standard `Request` / `Response` work; `NextRequest` / `NextResponse` add helpers (cookies, nextUrl, geo).
- Dynamic segment context is `RouteContext<route>`: `export async function GET(req: Request, ctx: RouteContext<'/api/bookings/[id]'>) { const { id } = await ctx.params }`.

### Caching APIs

- `revalidateTag('foo', 'max')` — second argument (a `cacheLife` profile) is required. Single-arg form is deprecated and TypeScript-errors.
- `updateTag('foo')` — new Server-Actions-only API for read-your-writes (no `cacheLife` arg). Use this when the user needs to see their write immediately.
- `refresh()` — new Server-Action helper to refresh client router state.
- `cacheLife`, `cacheTag` — stable; drop the `unstable_` prefix from imports.

### Turbopack is the default

- `next dev` and `next build` use Turbopack with no flag. The `--turbopack` flags currently in `package.json` are redundant — strip them (or keep, harmless).
- `--webpack` is the opt-out flag.
- Webpack config in `next.config.ts` will **fail the build** unless you also pass `--webpack`. We have none today; safe.
- Top-level `turbopack: { ... }` in `next.config.ts` (formerly `experimental.turbopack`).
- Dev output goes to `.next/dev`, build output to `.next` — they can run concurrently.

### `middleware` → `proxy`

- Rename `middleware.ts` → `proxy.ts`. Rename the exported function `middleware` → `proxy`.
- Runtime is **Node only**; the `edge` runtime is NOT supported in `proxy`. Keep `middleware.ts` if you need edge.
- Config flags renamed: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.
- We use `src/proxy.ts` today to inject `x-pathname` so the root layout can resolve theme server-side (see §9.3).

### PPR / Cache Components

- `experimental.ppr`, `experimental.dynamicIO`, route segment `experimental_ppr` — all removed.
- Replacement: `cacheComponents: true` in `next.config.ts`. **Don't enable by default** — adopt only when Phase 6 starts.

### Removed entirely

- `next lint` command. Use `eslint` CLI directly (already done: `"lint": "eslint"` in `package.json`). `next build` no longer runs linting.
- `eslint` option in `next.config`.
- AMP (`next/amp`, `useAmp`, `config = { amp: true }`).
- `serverRuntimeConfig` and `publicRuntimeConfig`. Use `process.env.*` and `NEXT_PUBLIC_*` instead. For runtime env (not bundled at build time), `await connection()` from `next/server` first.
- `unstable_rootParams`.
- `devIndicators.appIsrStatus`, `buildActivity`, `buildActivityPosition`.

### `next/image` changes

- `next/legacy/image` deprecated — use `next/image`.
- `images.domains` deprecated — use `images.remotePatterns`.
- New defaults that may surprise: `minimumCacheTTL` 60s → 4h, `qualities` now `[75]` only, `maximumRedirects` now `3`, `imageSizes` drops `16`, local IPs blocked (`dangerouslyAllowLocalIP`).
- Local images with query strings require `images.localPatterns.search`.

### Parallel routes

- Every parallel route slot now requires an explicit `default.js`. Build fails without it. For us: irrelevant until we use parallel routes (likely never for v1).

### Scroll behavior

- Next 16 **no longer overrides** `scroll-behavior: smooth` during navigation. To restore the old "force scroll-to-top instant" behavior, add `data-scroll-behavior="smooth"` to `<html>`. Default is fine for us.

### React 19.2 features available

- View Transitions (`<ViewTransition>`)
- `useEffectEvent` — extract non-reactive Effect logic
- `<Activity>` — render hidden UI that keeps state
- All React 19.x form action features: `useActionState`, `useFormStatus`, `use()`, server actions
- React Compiler available behind `reactCompiler: true` opt-in (defer to Phase 6 — adds Babel to the build, slower).

### `next/font/google` canonical usage

```tsx
import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Then in `globals.css` (or `tokens.css`), `font-family: var(--font-display)` works because next/font has defined the variable on `<html>`. **Remove the `@import url('https://fonts.googleapis.com/...')` from `src/styles/tokens.css`** — next/font self-hosts.

### CSS / Tailwind v4 setup (confirmed)

```css
/* app/globals.css */
@import 'tailwindcss';
@import '../styles/tokens.css';
@import '../styles/themes/default.css';
```

Then import `globals.css` once in root `layout.tsx`.

### Misc behaviors to know about

- `next dev` no longer loads `next.config.js` twice — `process.argv` no longer includes `'dev'` from inside the config. Use `process.env.NODE_ENV === 'development'` for dev-only side effects.
- `next build` no longer prints `size` / `First Load JS` metrics. Use Lighthouse or analytics instead.
- ESLint flat config is the default (our `eslint.config.mjs` is already flat).
- Min Node.js 20.9. Min TypeScript 5.1. Browsers: Chrome/Edge/Firefox 111+, Safari 16.4+.

### Codemod path (for future upgrades)

`npx @next/codemod@canary upgrade latest` — handles config rewrites, middleware→proxy, async-API migration. Worth running once at the start to clean up anything we missed.

---

## 8. Versions pinned (resolved 2026-05-12)

```jsonc
// package.json — current state after Phase 0 install
{
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.2",
    "@prisma/client": "^6.19.3",
    "@stripe/react-stripe-js": "^6.3.0",
    "@stripe/stripe-js": "^9.4.0",
    "next": "16.2.6",
    "next-auth": "^5.0.0-beta.31",  // Auth.js v5 — still beta-tagged; stable API
    "prisma": "^6.19.3",
    "qrcode": "^1.5.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "resend": "^6.12.3",
    "stripe": "^22.1.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

> Note: `next-auth@5.0.0-beta.31` is the current Auth.js v5 channel. API is stable; only the version tag is `beta`. Pin tightly when the next stable lands.

---

## 9. Hardening conventions (Phase 5++)

These were introduced after the customer booking flow landed. Every future agent must follow them.

### 9.1 Dev-without-DB fallback (`src/lib/env.ts`)

- `isDevWithoutDb()` is the **only** place to check for "running in dev with no real `DATABASE_URL`". Modules that would otherwise hit Prisma return mock data when this returns true. Examples: `getTenant()`, `getPackagesForTenant()`, `acquireBookingHold()`, `confirmBooking()`.
- Never inline `process.env.DATABASE_URL` checks in feature code. Always import `isDevWithoutDb`.
- `warnOnce(key, message)` from the same module is the one-warning-per-process helper. Use it for any "you didn't set X env var" message so logs don't repeat per request.
- Production always returns false from `isDevWithoutDb()` regardless of env var presence — deployments must have a real DB URL.

### 9.2 Wall-clock subscription (`src/lib/use-wall-clock.ts`)

- `useWallClockNow(): number` is the **only** way a component should read the current millisecond timestamp in render.
- `Date.now()` in a component body is rejected by `react-hooks/purity`. Never inline a `setInterval`-based tick or `useSyncExternalStore` clock in a component or page — it duplicates work and leaks intervals.
- One module-level interval serves all subscribers and tears down when the last one unmounts.

### 9.3 Theme resolution (`src/lib/theme.ts` + `src/proxy.ts`)

- Theme is resolved **server-side** in the root layout via `resolveTheme()`. The result is stamped on `<html data-theme="…">` during SSR — no client script, no `suppressHydrationWarning`, no FOUC.
- Inputs to `resolveTheme()`:
  1. **Pathname** (via the `x-pathname` header set by `src/proxy.ts`). Paths matching `/staff(/|$)` or `/admin(/|$)` are ALWAYS dark.
  2. **`theme` cookie** for all other paths. Defaults to `'light'` when absent.
- Customer-facing toggle (future) calls `setThemeCookie('dark' | 'light')` as a Server Action, then `router.refresh()`.
- NEVER add another inline `<script>` to set `data-theme`. NEVER read `localStorage` for theme — cookies survive SSR; localStorage doesn't.
- NEVER use Tailwind's `dark:` prefix (drift sentinel rejects it).

### 9.4 Date/value serialization across server actions

- Server actions in Next 16 use the React Flight wire format, which preserves `Date`, `Map`, `Set`, `BigInt`, typed arrays, and `FormData`. If an action's return type declares `Date`, pages consume it as `Date` — no defensive `new Date(...)` wrapping per consumer.
- Inputs to server actions are validated structurally by TypeScript today. When adding actions that take untrusted client data (Phase 6+), wrap inputs in `zod` schemas at the action boundary — not in the page.

### 9.5 Tests (`vitest`)

- Test stack: Vitest 4 with `@vitest/coverage-v8`. No JSDOM yet — current tests are pure-function only.
- File naming: `<module>.test.ts(x)` colocated with the source (`src/lib/pricing.test.ts` next to `src/lib/pricing.ts`). Vitest's `include` glob picks them up automatically; ESLint and tsc include them; the drift sentinel scans them.
- Scope today: every pure function in `src/lib/` should have tests covering the documented behavior and edge cases (zero/negative inputs, boundary values, integer-cents invariants). React component tests come later when we add Testing Library.
- Run with `npm test`. `npm run verify` runs the full chain: tsc + ESLint + drift sentinel + Vitest.
- Mock env vars with `vi.stubEnv(...)` + `vi.unstubAllEnvs()`. Don't try to assign to `process.env.NODE_ENV` directly — Node 20 rejects it.

### 9.6 CI

- `.github/workflows/verify.yml` runs `npm run verify` and uploads coverage on every push and PR to `main`. A failing pipeline blocks merge.
- The workflow also runs `npx prisma generate` so the Prisma client compiles even though we don't connect to a real DB in CI.
- If you add a new check (lint, drift rule, test type), wire it into `npm run verify` so CI catches it — don't add a separate workflow step.

### 9.7 Payments, holds, refunds, email (Phase 7)

- **Holds** live in a separate `BookingHold` table (NOT nullable `Booking.packageId`). A hold is an availability lock, not a draft booking — it has no package, no customer, no payment. Acquired at step 2, deleted on step-4 success (by the webhook) or expiry.
- **Hold expiration is lazy.** `getAvailableTimeSlots()` runs `DELETE FROM booking_hold WHERE expires_at < now()` before computing availability. No cron job.
- **Booking creation has EXACTLY ONE writer**: the Stripe webhook handler on `payment_intent.succeeded`. `confirmBooking()` returns a `client_secret` for the browser to confirm the card; it never creates a Booking row. This guarantees every CONFIRMED booking has a captured payment.
- **Webhook idempotency** is enforced by the `StripeEvent` table. The first DB write is `stripeEvent.create({ id: event.id, ... })`. A P2002 conflict means we've already processed the event — return 200, skip side effects.
- **Refund flow is async-honest.** The `refundBookingAction` server action calls Stripe + writes `Payment.refundStatus = PENDING` + writes an `AuditLog` row. The webhook (`charge.refunded`) is the SOLE place that flips to SUCCEEDED/FAILED and sets `Booking.isRefunded`. UI shows "pending" until the webhook clears it.
- **`src/lib/stripe.ts` is the ONLY file that imports `stripe`.** Type re-exports go through `import { type Stripe } from '@/lib/stripe'`.
- **`src/lib/email.ts` is the ONLY file that imports `resend`.** It's also the ONLY file in `src/**/*.ts` allowed to use raw hex colors (ESLint + drift have explicit exceptions documented in-file).
- **Email is sent from the webhook handler**, not the server action. Email is a side effect of payment success, not button click. Acceptable to be in-line with the webhook for v1; move to a queue if it ever causes Stripe retries.
- **Mock mode composes.** dev-without-db + dev-without-stripe still produces a clickable booking flow. `confirmBooking` returns a fake client_secret, webhook short-circuits, and `getPackagesForTenant` returns mock packages. Use for design exploration only.
- **Full contract:** `.claude/contracts/PAYMENTS.md` covers schema, lifecycle diagrams, refund flow, env vars, testing patterns, and known v1 limits.

### 9.8 Staff shell (Phase 8)

- **Route-group layouts are the auth chokepoint.** `src/app/(staff)/layout.tsx` and `src/app/(admin)/layout.tsx` MUST call `requireRole(...)`. Pages never call it themselves — the drift sentinel fails verify if either layout omits the check. Don't add per-page guards; they drift.
- **Chrome vs. patterns.** Components that own viewport positioning (`fixed`/`sticky` sidebars, tab bars, top bars) live in `src/components/chrome/`, not `src/components/patterns/`. Patterns render content cards; chrome positions the shell. The drift sentinel still bans `fixed` in patterns.
- **Staff theme is locked to dark** via `proxy.ts → resolveTheme()` for `/staff/*` and `/admin/*`. The shell never sets `data-theme` directly.
- **Staff actions live in `src/lib/actions/staff.ts`.** Every export starts with `await requireRole('STAFF', 'MANAGER', 'ADMIN')` (or stricter). Dev-without-DB returns deterministic mocks so the entire staff app is reviewable without Postgres.
- **Walk-in bookings bypass Stripe.** `createWalkInBooking()` writes the `Booking` row directly with `status='CONFIRMED'` and `source='WALK_IN'`, plus a `Payment` row whose `status` is one of `cash` / `card_at_counter` / `pending` (set from the staff's choice on the form). The webhook never sees walk-ins. v1 cannot Stripe-refund a walk-in (the action throws); add a "manual refund" path in Phase 9 if needed.
- **Lane blocking uses the existing `BlockedSlot` table.** `lanes: number[]` is lane numbers; empty array = all lanes. Bookings AND blocks both appear on `ScheduleTimeline`.
- **Icons: `lucide-react`.** Used only in `src/components/chrome/` and pages. Patterns + primitives stay icon-agnostic — they take icons via props if needed.
- **Full contract:** `.claude/contracts/STAFF.md` covers the route-group layout, the action surface, and the deferred admin surfaces.

### 9.9 Admin shell (Phase 9)

- **Shared shell.** `src/components/chrome/app-shell.tsx` is consumed by BOTH `(staff)/layout.tsx` and `(admin)/layout.tsx`. The layouts pass nav items + an `eyebrowLabel` ("Staff" / "Admin") + an optional `secondaryFooter` (admin uses this for the "← Staff cockpit" cross-link). Don't duplicate the shell when adding a new route group — extend AppShell with a new prop instead.
- **Admin actions live in `src/lib/actions/admin.ts`.** Every export starts with `await requireRole('MANAGER', 'ADMIN')`. ADMIN-only assignments enforce a second check via `requireCanAssignRole(caller, targetRole)`.
- **Soft delete only.** Packages are archived (`active = false`), users are deactivated (role → CUSTOMER + `passwordHash = null`). Hard delete is forbidden because both are referenced by historical bookings.
- **Self-mutation forbidden.** A user cannot change their own role or deactivate themselves. The server action throws; the UI hides the affordance.
- **Audit-log every write** in the same `prisma.$transaction` as the mutation. Action types are documented in `.claude/contracts/ADMIN.md`. Audit `details` carries only salient scalars, never the full input (Prisma's `Json` rejects typed interfaces without index signatures).
- **Team invites use admin-set initial passwords**, told out of band. No email magic links in v1 — keeps the auth model identical to the customer Credentials flow.
- **Operating hours edit replaces all 7 rows atomically** rather than diffing. Simpler and avoids partial-update bugs.
- **Dev-without-DB returns deterministic mock data** for every admin read, so the full admin surface is clickable without Postgres.
- **Full contract:** `.claude/contracts/ADMIN.md` covers route layout, action surface, lifecycle diagrams, audit-log conventions, and the deferred surfaces.

### 9.10 Customer self-service + runbook (Phase 10)

- **Customer cancel via lookup, not login.** `/find-my-booking` takes email + confirmation code (case-insensitive). No customer accounts in v1. Rate-limiting lives at the reverse proxy / WAF; documented in `docs/RUNBOOK.md`.
- **Cancellation policy lives in `Tenant.config` JSON**, read via `getCancellationPolicy(tenant)` in `src/lib/tenant.ts`. Defaults: 24h window, 100% refund. Admin UI to edit deferred to Phase 11.
- **Customer-initiated refunds reuse the Stripe webhook path** — `cancelBookingAction` calls `createRefund`, then the `charge.refunded` webhook flips `Payment.refundStatus = SUCCEEDED`. One refund pipeline, no new state machine.
- **Walk-in manual refunds are a sibling action.** `manualRefundBookingAction` writes directly to Payment + Booking + AuditLog. No Stripe call. The two actions are mutually exclusive: Stripe action rejects walk-ins, manual action rejects Stripe payments.
- **Audit log viewer is ADMIN-only.** MANAGER can view bookings / refunds / walk-ins via the normal pages. The audit log adds nothing they need for daily ops and contains PII in `details`.
- **`.ics` is a public route** at `/api/bookings/[code]/ics?email=…`. Same email-as-auth model as `/find-my-booking`. Linked from success page + confirmation email.
- **Production runbook lives at `docs/RUNBOOK.md`** — env vars, Stripe webhook setup, Resend DNS, migrate deploy, seed flow, smoke checklist, ops triage, known gaps. **Single source of truth for operators.**

### 9.11 Drift sentinel additions (Phase 11)

- **Non-async exports in `'use server'` files are banned.** Next.js rejects them at module-eval time ("A 'use server' file can only export async functions"); TypeScript doesn't catch it. The drift sentinel does. Canonical pattern: when a `'use server'` module needs to expose a constant, move the constant to a sibling non-`'use server'` module (e.g. `src/lib/audit-actions.ts` is the sibling for `src/lib/actions/admin.ts`). Allowed in a `'use server'` file: `export async function`, `export default async function`, and erased type-only declarations (`interface`, `type`, `enum`).
- **`src/lib/themes.ts` may use raw hex** in `swatchHex` strings only (admin theme-picker metadata). The drift sentinel excludes this file from the `raw hex colors` rule alongside `src/lib/email.ts`. ESLint mirrors this via `eslint.config.mjs` (`royalz/theme-swatch-metadata-exception`).

### 9.12 Branding (Phase 11)

- **`Tenant.themeSlug`** selects a visual preset. The root layout sets **`data-theme-preset`** on `<html>` (from `getTenant()` + `isValidThemeSlug`), separate from **`data-theme`** (light/dark from `resolveTheme()`).
- Presets are registered in **`src/lib/themes.ts`** and implemented as **`src/styles/themes/<slug>.css`** imports in **`src/app/globals.css`**. Each active file overrides only the **`--color-action*`** family (and optionally **`--surface-dark`**); components stay unchanged.
- Admins pick a preset on **`/admin/venue`**; **`updateTenantAction`** validates the slug, persists the column, and logs **`themeSlug`** in audit `details`.

### 9.13 Admin reports charts (Phase 11 M6)

- **`recharts`** powers the `/admin/reports` client chart island (`reports-charts.tsx`); the route remains a Server Component and passes serialized `daily` / `topPackages` props.
- **Strokes and fills** use semantic CSS variables (e.g. `var(--color-action)`), never raw hex, so charts match the token system on `data-theme="dark"` admin chrome.

---

### 9.15 Payments polish (Phase 12 M12-M2)

- **3DS (M12-M2a)** — `PaymentForm`: `confirmPayment` + `handleNextAction` on `requires_action`; success page handles `redirect_status=failed`; copy in `src/lib/payment-errors.ts`.
- **Payment resume links** — staff `createPaymentResumeLink` + customer `/book/resume-payment`; token signing in `src/lib/payment-resume-token.ts`.
- **Stacked Stripe partial refunds** — `refundBookingAction` refunds against **remaining** balance; webhook cancels booking only when fully refunded.

### 9.14 Ops / abuse resistance (Phase 12 M12-M1)

- **Rate limits** for public surfaces live in `src/lib/rate-limit.ts` + `src/lib/env.ts`; enforced in `src/proxy.ts`, `getBookingByLookup`, `validatePromoCode`, and the `.ics` route. Full contract: `.claude/contracts/OPS.md`.
- **WAF remains mandatory** in production; in-app limits are per-instance best-effort only.
- **Sentry traces:** `getSentryTracesSampleRate()` — 0 in non-production, default 0.1 in production (`SENTRY_TRACES_SAMPLE_RATE` optional).

### 9.12 Promo codes (Phase 11 M5)

- **Public validation** — `validatePromoCode` in `src/lib/actions/promo.ts` has no session; it only reads `PromoCode` and returns resolved cents. Brute force is bounded by the same edge/WAF posture as other public lookups (`docs/RUNBOOK.md`).
- **Triple validation** — Customer preview (`BookingContext.applyPromoCode`), `confirmBooking` (PaymentIntent amount), and webhook (increment + link). Metadata carries `promoCode` + `discountCents`; webhook honors paid amount even if the code was deactivated between intent creation and capture (warn + still record `discountAmount`).
- **Contract** — `.claude/contracts/PROMO_CODES_DEPRECATED.md` is the source of truth for the current PromoCode model (deprecated — replaced by CODE_REQUIRED packages in Migration 4). Covers schema, audit actions, and invariants (`usesCount` only in webhook, soft delete only).

## 10. Open questions deferred (post-v1)

- **Background queue for email.** v1 sends inline with the webhook; consider moving to a queue (e.g. Inngest, QStash) if Resend latency starts causing Stripe retries.
- **Booking modification / reschedule.** Customers can cancel but not reschedule. Deferred to Phase 12.
- **Customer accounts (sign-up, magic link, `/account` dashboard).** Bookings have nullable `userId`; the lookup-by-code flow covers v1. Deferred to Phase 12.
- **Integrations panel.** Read-only status for Stripe / Resend / NextAuth secrets. Key rotation stays deploy-time only.
- **Email reminders (24h before).** Needs a scheduler (cron or Inngest).
- **SMS notifications.** Twilio integration.
- **PWA manifest** for the staff app.
- **a11y + Lighthouse perf audit** before mass operator onboarding.
- **Multi-tenant subdomain routing.** Currently single-tenant; `getTenant()` is the chokepoint that future routing will rewrite.

These do not block v1 launch.
