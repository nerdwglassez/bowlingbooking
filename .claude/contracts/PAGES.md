# Pages Contract

> **Booking flow status (May 2026):** All 5 steps built (`/book` → `/book/package` →
> `/book/details` → `/book/confirm` → `/book/success`). Stripe + webhook live.
> `confirmOfflineBooking` for PAYMENT_OFFLINE packages. Sections below may describe
> earlier milestone language — prefer `BOOKING_INTERACTIONS.md` + repo for current behavior.

Source of truth for **every file under `src/app/`**. Agents building pages MUST read this file, the patterns contract (`.claude/contracts/PATTERNS.md`), and the Figma frame for their route (see FIGMA.md). Historical wireframes are not visual SoT.

A **page** is a route segment in the Next.js App Router. Pages are the only layer that:
- Owns viewport-level layout (sticky positioning, scrollable containers, full-page chrome).
- Owns form state via `BookingContext` (or local `useState` for trivial cases).
- Calls server actions and reads from data sources (`getTenant`, Prisma, fetch).
- Handles routing transitions (`router.push`, `redirect`).
- Composes patterns from `src/components/patterns/`.

Pages NEVER define their own colors, fonts, shadows, borders, or component visuals. Those live in tokens (via primitives, via patterns). Pages are layout + state + data + navigation only.

---

## 1. Layer rules

```
tokens → Untitled base/application → patterns → pages (this layer)
```

A page can import:
- Any pattern from `src/components/patterns/*`.
- Untitled from `src/components/base/*` / `src/components/application/*` — but **only** when no pattern fits. New staff code must not add `@/components/ui/*` call sites (shims are for unreworked customer surfaces). If you find yourself reaching for a card directly in a page, ask whether a `pattern` should encapsulate the composition instead.
- Server actions and helpers from `src/lib/*` (auth, tenant, prisma, pricing, lane-logic, actions/*).
- The booking context from `src/context/BookingContext`.
- Types from `src/types`.
- Next.js APIs: `next/navigation` (`redirect`, `notFound`, `useRouter`), `next/headers` (`cookies`, `headers`), `next/link`.

A page can NOT import:
- Other pages.
- Raw Prisma in a Client Component (`'use client'` files) — call a Server Action instead.
- `stripe`, `resend`, `prisma` in Client Components.
- CSS files (styles arrive via tokens → primitives → patterns).

---

## 2. Hard rules (drift sentinel scans `src/app/` too)

Same drift checks as primitives/patterns:

1. **No raw hex colors.** Period.
2. **No Tailwind color utilities.** No `bg-amber-500`, `text-stone-700`, etc.
3. **`dark:` is allowed** only via `@custom-variant dark` → `[data-theme="dark"]`. Never `prefers-color-scheme`.
4. **Tailwind is for layout plus Untitled semantic color utilities.** No raw palette utilities.
5. **No `bg-[var(--…)]` on plain `<div>`s.** Use a primitive. If you're styling page chrome (e.g. the booking shell), use `<Card variant="flat">` or `<Card variant="default">` rather than recreating it.
6. **No font-family declarations.** Headings use native `<h1>`–`<h6>` and inherit from `globals.css`.
7. **Sticky/fixed positioning lives on the page shell**, not in patterns. `BookingFlowShell` places the optional footer slot; patterns render the footer content only.
8. **Tenant data via `getTenant()`** — never hardcode "Royal Z Lanes", "123 Main St", etc. The first line of any tenant-aware page is usually `const tenant = await getTenant()`.
9. **Auth checks via `auth()` and `requireRole()`** from `src/lib/auth.ts`. Never read NextAuth session manually.
10. **Server actions for mutations.** Don't `fetch('/api/...')` from the client when a server action will do.
11. **`useState` is allowed in pages** for local UI state (e.g. "is the modal open?"). But persistent booking flow state lives in `BookingContext`, not in the page.
12. **Trust the React Flight wire format.** Server-action return values typed as `Date`, `Map`, `Set`, `BigInt`, or typed arrays round-trip as their original types. Do NOT defensively re-wrap with `new Date(...)` per-consumer. If a value comes back as the wrong type, fix it at the action — never normalize per-page.
13. **Wall-clock time uses `useWallClockNow()`** from `src/lib/use-wall-clock`. Never call `Date.now()` in a component body (`react-hooks/purity` will fail), and never inline your own `setInterval` tick.
14. **Dev-without-DB fallback is opaque to pages.** Pages always `await getTenant()` / call server actions. The `src/lib/env.ts` helper decides whether to short-circuit; callers don't branch on `process.env`.

---

## 3. File location and naming

The customer booking flow lives at `src/app/(customer)/book/...`:

```
src/app/(customer)/
├── layout.tsx                  ← customer route-group layout (already exists)
└── book/
    ├── layout.tsx              ← wraps booking shell in <BookingProvider>
    ├── page.tsx                ← scheduling: bowlers + date + “Choose a time” + grid + hold + CTA to packages
    ├── time/page.tsx           ← redirects to `/book` (bookmark compatibility)
    ├── package/page.tsx        ← package selection
    └── confirm/page.tsx        ← customer info + checkout
```

Each `page.tsx` exports a default React component. Naming is fixed by Next.js conventions — do NOT invent your own.

Loading states (`loading.tsx`), error boundaries (`error.tsx`), and `not-found.tsx` are out of scope for v1. Skip them unless explicitly required.

---

## 4. Required page shell

Every booking step page must:

1. Start with `'use client'` (booking pages read/write `BookingContext`).
2. Wrap content in `<BookingFlowShell>` with `currentStep`, `holdExpiresAt`, and optional `footer` + `back` (steps 3–4). Pass `showSignIn` + `signInHref={CHECKOUT_SIGN_IN_PATH}` only on confirm (step 4).
3. Get tenant chrome via the `useTenant()` hook from `src/app/(customer)/book/tenant-provider`. The server-rendered `book/layout.tsx` calls `getTenant()` once and wraps its children in `<TenantProvider value={tenant}>`. Pages never call `getTenant()` directly — that would be a Prisma call from a `'use client'` file (forbidden).
4. Read booking state via `useBooking()`.
5. On "Next" CTA, call any required server action, update context, then `router.push('/book/next-step-path')`.
6. On header back (steps 3–4), navigate back without losing state (BookingContext lives at the `book/layout.tsx` level so it survives intra-flow navigation).

---

## 5. BookingContext API

Already implemented at `src/context/BookingContext.tsx`. Pages consume via:

```tsx
'use client'
import { useBooking } from '@/context/BookingContext'

export default function Step1Page() {
  const { session, setBowlerCount, setDate } = useBooking()
  // …
}
```

Available setters (all granular; cascading invalidation built in):

| Setter | Updates | Invalidates downstream |
|---|---|---|
| `setBowlerCount(n: number)` | `bowlerCount`, `laneCount` (auto) | `timeSlotId`, `holdExpiresAt`, `selectedPackage`, `totalAmount` |
| `setDate(d: string)` | `date` | `timeSlotId`, `holdExpiresAt`, `selectedPackage`, `totalAmount` |
| `setTimeSlot(slot, holdExpiresAt)` | `timeSlotId`, `startTime`, `endTime`, `holdExpiresAt` | `selectedPackage`, `totalAmount` |
| `setPackage(pkg, totalAmount)` | `packageId`, `selectedPackage`, `totalAmount`, `partyType` (auto) | — |
| `setCustomerInfo({name?, email?, phone?})` | partial update of the three fields | — |
| `setStripeSecret(secret)` | `stripeClientSecret` | — |
| `resetSession()` | resets everything to defaults | all |

Selection invariants: by the time the user reaches step N, the session must contain all fields needed for step N − 1. If a page detects missing prereqs, it should `redirect('/book')` (back to step 1).

---

## 6. Server actions

Server actions for the booking flow live in `src/lib/actions/booking.ts`. Pages call them via the standard React 19 `<form action={...}>` pattern OR by invoking them directly from a client handler (`await acquireHold(input)`). All server actions are `'use server'` directives.

V1 surface:

| Action | Purpose | Used by |
|---|---|---|
| `getTenant()` (already in `lib/tenant.ts`) | Resolve tenant from `DEFAULT_TENANT_SLUG` env | every step's layout |
| `getAvailableDates(tenantId, days)` | Return next N days with availability flags for the strip | `/book` |
| `getAvailableTimeSlots(tenantId, dateISO, bowlerCount)` | Return time slots for the chosen date | `/book` (after date selected) |
| `acquireBookingHold({tenantId, startTime, endTime, bowlerCount})` | Create hold; returns `holdId` + `expiresAt` | `/book` time cell select |
| `releaseBookingHold()` | Release prior hold when switching slots | `/book` |
| `getPackagesForTenant(tenantId)` | Fetch all active packages (PUBLIC + CODE_REQUIRED) | `/book/package` |
| `validatePackageAccessCode(tenantId, code)` | Unlock CODE_REQUIRED package | `/book/package` |
| `confirmBooking(input)` | Create Stripe PaymentIntent; webhook creates Booking | `/book/confirm` |
| `confirmOfflineBooking(input)` | PAYMENT_OFFLINE → PENDING_PAYMENT (no Stripe) | `/book/confirm` |

Dev-without-DB: read actions return mocks; `acquireBookingHold` and production paths use Prisma when `DATABASE_URL` is set. Stripe is wired via PaymentIntent + webhook — not stubbed.

Page agents should call these by importing from `@/lib/actions/booking`. If a function is missing, file a "needed action" line in your report — do NOT implement the action in the page file.

---

## 7. Per-page scope notes

Each of the four booking pages. Read FIGMA.md (frame URL when available) AND the relevant patterns before starting. Historical HTML wireframes are not visual SoT.

### Staff routes (Figma URL TBD)

Staff pages compose AppShell chrome. Visual SoT is the Figma frame in FIGMA.md + the matching `staff/0N_*.md`. Do not restyle page interiors until a frame URL is pasted. New staff UI imports `base/` / `application/`, not new `ui/` files.

**Settings → Profile (built):** desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-3465 — mobile https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-8694. `/staff/settings` redirects to `/staff/settings/profile`. Section switcher: desktop tabs, mobile Select.

**Settings interiors ready to apply (FIGMA.md):** Venue desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-7420 — Operating hours desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-6744. Reuse the section switcher; restyle form bodies only. Pricing / packages / policies / team / integrations still wait.

**Reports (ready to apply):** Reporting desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=104-3249 → `/staff/reports`. Contacts desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-2437 → `/staff/reports?view=contacts` (primary rail item, MANAGER+).

**Support (built):** `/staff/support` — venue phone / email / address from `getTenant()`. No country field.

### `app/(customer)/book/page.tsx` — Scheduling (wireframe Step 1: bowlers + date + “Choose a time” on one screen)
**Visual:** Figma frame TBD (paste URL when available). Historical: `docs/wireframes/customer/booking-step1-2-branded.html` — Step 1 variants **1a** / **1b** (same route: empty “Choose a time” until a date exists, then `<TimeSlotGrid>` + hold in place).
**Phase 0:** `.claude/specs/customer/PHASE_0_BOOKING_WIREFRAMES.md` — `<StepIndicator currentStep={1}>`.
- Compose: `<BookingFlowShell currentStep={1}>` + `<BookingFlowLead>` + `<BowlerCounter>` + date/time sections + inline `<Button>` CTA at bottom — **no dark footer bar**. CTA **"Select a date and time to continue"** until slot + valid hold, then **"Continue to packages →"** → `router.push('/book/package')`.
- State reads/writes: `setBowlerCount`, `setDate`, `setTimeSlot`; session fields as today.
- Data: `getAvailableDates`, `getAvailableTimeSlots` — DO NOT call Prisma from the client.
- Slot select: `acquireBookingHold` → `setTimeSlot`; switching slots calls `releaseBookingHold` for the prior id when it changes.

### `app/(customer)/book/time/page.tsx` — Legacy URL
Redirects to `/book` so old links still work.

### `app/(customer)/book/package/page.tsx` — Package selection (user’s second full-screen chapter; milestone **2**)
**Visual:** Figma frame TBD (paste URL when available). Historical: `docs/wireframes/customer/booking-step2-refined.html` (and Step 2 block in `booking-step1-2-branded.html`). Lane strip also referenced in `booking-step3-final.html`.
**Phase 0:** `<StepIndicator currentStep={2}>`. Milestone **3** in the four-dot wireframe has no dedicated URL; confirm uses **4**.
- Guard: if `!session.timeSlotId`, `redirect('/book')`.
- Compose: `<BookingFlowShell currentStep={2} footer={<BookingFlowFooter …>}>` + `<BookingFlowLead>` + access code field + `<PackageListToolbar>` + `<PackageCard>` list + `<PackageDetailSheet>`. Footer: **CTA only** — disabled **"Select a package to continue"** until selection + valid hold.
- CTA: requires `session.packageId != null` and valid hold. On click, `router.push('/book/details')`.

### `app/(customer)/book/details/page.tsx` — Step 3 (Shoe sizing + contact)
**Visual:** Figma frame TBD (paste URL when available). Historical: `docs/wireframes/customer/booking-step3-dropdown.html`.
- Guard: if `!session.timeSlotId`, `redirect('/book')`.
- Compose: `<BookingFlowShell currentStep={3} back={BOOKING_BACK_BY_STEP[3]} footer={<BookingDetailsFooter …>}>` + contact + shoe sections. Footer: contextual CTA only.

### `app/(customer)/book/confirm/page.tsx` — Step 4 (Review + Payment)
**Visual:** Figma frame TBD (paste URL when available). Historical: `docs/wireframes/customer/booking-step4-confirmation.html`.
- Guard: if missing prereqs, redirect upstream.
- Compose: `<BookingFlowShell currentStep={4} showSignIn signInHref={CHECKOUT_SIGN_IN_PATH} back={BOOKING_BACK_BY_STEP[4]} footer={<PaymentPriceFooter …>}>` + `<OrderSummaryCard>` (itemized pricing in-content) + consents + Stripe form. Footer: Pay/Confirm CTA only (+ optional policy note). Header Sign in is checkout-only.

### `app/signin/page.tsx` — Shared credentials login
**Visual:** FIGMA.md Sign-in row — [desktop](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1267-132204) · [mobile](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1267-137926).
- Compose: `<SignInThemeScope>` + `<SignInScreen>` + `<SignInForm>`. Page is composition only.
- Omit Google OAuth and Sign up (AUTH.md). Keep Remember for 30 days + Forgot password.
- Already signed in → `getPostSignInPath(from, user)`. Staff → `/staff`; customers from `/book/confirm` stay on checkout; generic `/` → dashboard or find-my-booking.
- Login password field hides the in-field eye toggle so Chrome / iCloud password widgets stay clickable.

### `app/forgot-password/page.tsx` — Request a reset link
**Visual:** FIGMA.md Forgot / reset password row — [flow](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1269-1186&t=y0Q5lMnzK3ixXLgG-4).
- Compose: `<SignInThemeScope>` + `<ForgotPasswordForm>` (renders `PasswordResetScreen`).
- Step 1: email + Reset password. Step 2: Check your email + Open email app + resend. Omit dummy sidebar stepper.

### `app/reset-password/page.tsx` — Set a new password
**Visual:** same Figma flow (set password + success).
- Compose: `<SignInThemeScope>` + `<ResetPasswordForm>` when `?token=` is present; invalid-link empty state otherwise.
- Password must be 8+ characters and include one special character (`src/lib/password-rules.ts`).

---

## 8. Imports cheat sheet

```tsx
// Patterns
import { BookingFlowShell } from '@/components/patterns/booking-flow-shell'
import { BookingAppHeader } from '@/components/patterns/booking-app-header'
import { BookingFlowFooter } from '@/components/patterns/booking-flow-footer'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { BowlerCounter } from '@/components/patterns/bowler-counter'
import { DateStrip } from '@/components/patterns/date-strip'
import { TimeSlotGrid } from '@/components/patterns/time-slot-grid'
import { PackageListToolbar } from '@/components/patterns/package-list-toolbar'
import { PackageDetailSheet } from '@/components/patterns/package-detail-sheet'
import { PackageCard } from '@/components/patterns/package-card'
import { OrderSummaryCard } from '@/components/patterns/order-summary-card'
import { PaymentPriceFooter } from '@/components/patterns/payment-price-footer'
import { EmptyState } from '@/components/patterns/empty-state'

// Untitled (sparingly — only when no pattern fits).
// Staff: `@/components/base/...` / `@/components/application/...`
// Customer may still use `@/components/ui/*` shims.
import { Input } from '@/components/ui/input'

// Context
import { useBooking } from '@/context/BookingContext'

// Server actions
import {
  getAvailableDates,
  getAvailableTimeSlots,
  acquireBookingHold,
  releaseBookingHold,
  getPackagesForTenant,
  confirmBooking,
} from '@/lib/actions/booking'

// Helpers
import { getTenant } from '@/lib/tenant'
import { calculatePrice, formatPrice } from '@/lib/pricing'

// Next
import { redirect, useRouter } from 'next/navigation'
```

---

## 9. Verification (same as primitives/patterns)

```bash
npm run verify
```

That runs `tsc --noEmit`, `eslint`, and `scripts/drift-check.mjs` against all of `src/`. Single command, single exit code.

---

## 10. What you do NOT do

- Do **not** add new patterns. If a page needs a new visual concept, stop and report it as a "pattern request" — Phase 4c builds it before you continue.
- Do **not** add new server actions in `lib/actions/`. If a page needs an action, file the request; the Domain agent owns adding it.
- Do **not** wire Stripe (Phase 7), Resend (Phase 7), or magic-link auth (Phase 7). Stub these with TODO comments.
- Do **not** add `loading.tsx`, `error.tsx`, or `not-found.tsx` files unless explicitly required.
- Do **not** install dependencies.
- Do **not** touch other pages' files.
