# Pages Contract

Source of truth for **every file under `src/app/`**. Agents building pages MUST read this file, the patterns contract (`.claude/contracts/PATTERNS.md`), and the wireframe(s) for their specific route before writing code.

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
tokens → primitives (ui/) → patterns → pages (this layer)
```

A page can import:
- Any pattern from `src/components/patterns/*`.
- Primitives from `src/components/ui/*` — but **only** when no pattern fits. If you find yourself reaching for `<Card>` directly in a page, ask whether a `pattern` should encapsulate the composition instead.
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
3. **No `dark:` prefix.**
4. **Tailwind is for layout only.** Spacing, sizing, flex/grid, positioning — fine. Color/font/border utilities are not.
5. **No `bg-[var(--…)]` on plain `<div>`s.** Use a primitive. If you're styling page chrome (e.g. the booking shell), use `<Card variant="flat">` or `<Card variant="default">` rather than recreating it.
6. **No font-family declarations.** Headings use native `<h1>`–`<h6>` and inherit from `globals.css`.
7. **Sticky/fixed positioning lives on the page**, not in patterns. Pages wrap `<PriceFooter>` and similar patterns in their own sticky container.
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
2. Compose, in order: `<VenueHeader>` → `<StepIndicator currentStep={N}>` → `<HoldTimer>` → step-specific content → `<PriceFooter>` wrapped in a sticky container.
3. Get tenant chrome via the `useTenant()` hook from `src/app/(customer)/book/tenant-provider`. The server-rendered `book/layout.tsx` calls `getTenant()` once and wraps its children in `<TenantProvider value={tenant}>`. Pages never call `getTenant()` directly — that would be a Prisma call from a `'use client'` file (forbidden).
4. Read booking state via `useBooking()`.
5. On "Next" CTA, call any required server action, update context, then `router.push('/book/next-step-path')`.
6. On the back arrow / step-indicator click on a past step, navigate back without losing state (BookingContext lives at the `book/layout.tsx` level so it survives intra-flow navigation).

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
| `getPackagesForTenant(tenantId)` | Fetch active packages | `/book/package` |
| `confirmBooking(input)` | Convert HOLD → CONFIRMED after payment intent succeeds | `/book/confirm` |

For v1, **`getAvailableDates`, `getAvailableTimeSlots`, and `getPackagesForTenant` may return mock data** so the flow renders. `acquireBookingHold` should write a real HOLD row (Prisma is wired). `confirmBooking` stubs the Stripe path — we wire it in Phase 7.

Page agents should call these by importing from `@/lib/actions/booking`. If a function is missing, file a "needed action" line in your report — do NOT implement the action in the page file.

---

## 7. Per-page scope notes

Each of the four booking pages. Read the named wireframe AND the relevant patterns before starting.

### `app/(customer)/book/page.tsx` — Scheduling (wireframe Step 1: bowlers + date + “Choose a time” on one screen)
**Wireframe:** `docs/wireframes/customer/booking-step1-2-branded.html` — Step 1 variants **1a** / **1b** (same route: empty “Choose a time” until a date exists, then `<TimeSlotGrid>` + hold in place).
**Phase 0:** `.claude/specs/customer/PHASE_0_BOOKING_WIREFRAMES.md` — `<StepIndicator currentStep={1}>`.
- Compose: `<VenueHeader onSignIn={…}>`, `<StepIndicator currentStep={1}>`, `<HoldTimer expiresAt={session.holdExpiresAt}>` (null until a slot is held), `<BookingFlowLead>` (subtitle `formatBowlersLanesDateSummary` once date is set), `<BowlerCounter>`, `<DateStrip>`, bordered **“Choose a time”** section (muted hint if `!session.date`; else loading / `<TimeSlotGrid>`), `<PriceFooter>` — CTA **“Select a date and time to continue”** until slot + valid hold, then **“Continue to packages →”** → `router.push('/book/package')`.
- State reads/writes: `setBowlerCount`, `setDate`, `setTimeSlot`; session fields as today.
- Data: `getAvailableDates`, `getAvailableTimeSlots` — DO NOT call Prisma from the client.
- Slot select: `acquireBookingHold` → `setTimeSlot`; switching slots calls `releaseBookingHold` for the prior id when it changes.

### `app/(customer)/book/time/page.tsx` — Legacy URL
Redirects to `/book` so old links still work.

### `app/(customer)/book/package/page.tsx` — Package selection (user’s second full-screen chapter; milestone **2**)
**Wireframe:** `docs/wireframes/customer/booking-step2-refined.html` (and Step 2 block in `booking-step1-2-branded.html`). Lane strip also referenced in `booking-step3-final.html`.
**Phase 0:** `<StepIndicator currentStep={2}>`. Milestone **3** in the four-dot wireframe has no dedicated URL; confirm uses **4**.
- Guard: if `!session.timeSlotId`, `redirect('/book')`.
- Compose: header + `<StepIndicator currentStep={2}>` + `<HoldTimer>` + `<BookingFlowLead title="Choose a package">` + `<PackageListToolbar>` + `<LaneAllocationView>` + `<PackageCard onOpenDetails={…}>` list + `<PackageDetailSheet>` + `<PriceFooter>` (disabled **“Select a package to continue”** until selection + valid hold).
- Data: `getPackagesForTenant(tenant.id)`.
- On select: `calculatePrice` → `setPackage(pkg, totalAmount)`.
- CTA: requires `session.packageId != null` and valid hold. On click, `router.push('/book/confirm')`.

### `app/(customer)/book/confirm/page.tsx` — Step 4 (Customer info + checkout)
**Wireframe:** `docs/wireframes/customer/booking-step4-confirmation.html`.
- Guard: if `!session.packageId`, `redirect('/book/package')`.
- Compose: header + step indicator (currentStep=4) + `<HoldTimer>` + `<BookingSummaryCard>` (read-only summary) + a customer info form (`<Input>`, `<Input>`, `<Input>` for name, email, phone) + `<PriceFooter ctaLabel="Pay & confirm" …>`.
- The customer form is implemented inline in the page using the Input primitive directly — DO NOT create a new pattern for it; a single-screen form doesn't earn pattern-hood yet.
- On change of any input, call `setCustomerInfo({ name?, email?, phone? })`.
- CTA: requires all three fields filled + basic email regex. On click, call `confirmBooking({ tenantId: tenant.id, packageId: session.packageId!, partyType: session.partyType ?? 'OPEN', bowlerCount: session.bowlerCount!, startTime: session.startTime!, endTime: session.endTime!, totalAmount: session.totalAmount!, customerName: session.customerName, customerEmail: session.customerEmail, customerPhone: session.customerPhone })` → on success, `resetSession()` and `router.push('/')`. (Stripe wiring is deferred to Phase 7; v1 inserts the booking directly in CONFIRMED state.)

---

## 8. Imports cheat sheet

```tsx
// Patterns
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { VenueHeader } from '@/components/patterns/venue-header'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { BowlerCounter } from '@/components/patterns/bowler-counter'
import { DateStrip } from '@/components/patterns/date-strip'
import { TimeSlotGrid } from '@/components/patterns/time-slot-grid'
import { PackageListToolbar } from '@/components/patterns/package-list-toolbar'
import { PackageDetailSheet } from '@/components/patterns/package-detail-sheet'
import { PackageCard } from '@/components/patterns/package-card'
import { LaneAllocationView } from '@/components/patterns/lane-allocation-view'
import { BookingSummaryCard } from '@/components/patterns/booking-summary-card'
import { PriceFooter } from '@/components/patterns/price-footer'
import { EmptyState } from '@/components/patterns/empty-state'

// Primitives (sparingly — only when no pattern fits)
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
