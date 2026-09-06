# STAFF.md — Contract for the staff & admin shells

Status: locked. Canonical settings at `/staff/settings/*`; legacy `/admin/*` redirects where noted below.

## Where things live

| Concern                          | Lives in                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| Route group + auth gating        | `src/app/(staff)/layout.tsx`, `src/app/(admin)/layout.tsx`     |
| App shell (sidebar / top bar)    | `src/components/chrome/app-shell.tsx`                          |
| Navigation chrome                | `src/components/chrome/nav-rail.tsx`                           |
| Support page                     | `src/app/(staff)/staff/support/page.tsx`                       |
| Cockpit page                     | `src/app/(staff)/staff/page.tsx`                               |
| Schedule + lane blocking         | `src/app/(staff)/staff/schedule/{page,blocking-panel,unblock-button}.tsx` |
| Booking detail + refund          | `src/app/(staff)/staff/bookings/[id]/{page,refund-panel}.tsx`  |
| Walk-in flow                     | `src/app/(staff)/staff/walkin/{page,walkin-panel}.tsx`         |
| Server actions                   | `src/lib/actions/staff.ts`                                     |
| Booking row pattern              | `src/components/patterns/booking-list-row.tsx`                 |
| Timeline pattern                 | `src/components/patterns/schedule-timeline.tsx`                |
| Lane blocking form (controlled)  | `src/components/patterns/lane-blocking-form.tsx`               |
| Walk-in form (controlled)        | `src/components/patterns/walk-in-form.tsx`                     |

## Hard rules

1. **Auth lives in the route-group layout.** Both `(staff)/layout.tsx` and `(admin)/layout.tsx` MUST call `requireRole(...)`. Pages NEVER call it themselves. The drift sentinel fails verify if a layout omits the check. This makes "did I remember to gate this new page?" impossible to get wrong — the answer is always yes, because the layout is the chokepoint.

2. **Server actions enforce role independently.** Every export in `src/lib/actions/staff.ts` starts with `await requireRole(...)`. Layouts gate the UI; the server action gates the call. Both are required because a client can still try to call a server action directly.

3. **Patterns are controlled, chrome positions the viewport.** `LaneBlockingForm` and `WalkInForm` are patterns — no `useState`, all state via props. The drift sentinel enforces this. Components that need `fixed`/`sticky` positioning (e.g. `NavRail`) live in `src/components/chrome/`, NOT `src/components/patterns/`. Chrome composes Untitled `application/` + `base/` (see UNTITLED.md).

4. **Walk-ins do not touch Stripe.** `createWalkInBooking` writes the `Booking` row directly and stamps `Payment.status` with `'cash' | 'card_at_counter' | 'pending'` — the staff's choice. The webhook never processes a walk-in. Online `refundBookingAction` cannot refund a walk-in (throws); use `manualRefundBookingAction` (MANAGER+) for cash/card-at-counter refunds.

5. **Refund UI is double-gated.** The booking detail page hides the `RefundPanel` for STAFF (UI only). `refundBookingAction` / `manualRefundBookingAction` enforce `requireRole('MANAGER', 'ADMIN')` server-side. Never lower the server-side check.

5b. **Staff cancel.** `staffCancelBookingAction` (STAFF+): cancel without refund for any role; optional Stripe refund only when `issueRefund: true` and caller is MANAGER+. Reasons: `CUSTOMER_REQUEST` | `NO_SHOW` | `VENUE_ISSUE`.

6. **Dev-without-DB returns mocks, never throws.** Every read in `staff.ts` (`getTodayBookings`, `getScheduleForDate`, `getBookingDetail`) returns deterministic mock data when `isDevWithoutDb()` is true. Writes (`createWalkInBooking`, `blockLanes`, `unblockLanes`) log and return a synthesized id with `mocked: true`. The full staff app is clickable without Postgres for design review.

## Lifecycle: walk-in booking

```
Staff opens /staff/walkin
  ↓
WalkInPanel (client) loads form state, computes total via calculatePrice
  ↓
User submits → createWalkInBooking server action
  ↓
requireRole(STAFF, MANAGER, ADMIN)
  ↓
prisma.$transaction([
  Booking.create({ status: 'CONFIRMED', source: 'WALK_IN' }),
  Payment.create({ status: paymentMethod }),       // skipped if total = 0
  AuditLog.create({ action: 'BOOKING_WALK_IN_CREATED' }),
])
  ↓
revalidatePath('/staff'), revalidatePath('/staff/schedule')
  ↓
router.push(`/staff/bookings/${result.bookingId}`)
```

## Lifecycle: lane block

**Authorization:** only **ADMIN** may create or delete lane blocks (`blockLanes` / `unblockLanes`). The schedule UI already hides the form from STAFF/MANAGER; the server action enforces the same rule.

```
Staff opens /staff/schedule
  ↓
ScheduleTimeline renders bookings + existing blocks for the day
  ↓
BlockingPanel form submitted → blockLanes server action
  ↓
requireRole + prisma.$transaction([BlockedSlot.create, AuditLog.create])
  ↓
revalidatePath('/staff/schedule')
  ↓
router.refresh() re-fetches the page
```

`unblockLanes` is the inverse and writes a `LANE_BLOCK_REMOVED` audit log.

## Lifecycle: refund (recap from PAYMENTS.md)

The refund flow is owned by `src/lib/actions/refund.ts` (Phase 7). The staff app contributes only the UI:

1. `RefundPanel` is rendered only when:
   - `user.role` is MANAGER or ADMIN, AND
   - `booking.payment.stripePaymentIntentId` is set (i.e. not a walk-in), AND
   - The booking is not already refunded and not already PENDING.
2. Submitting calls `refundBookingAction` which writes `refundStatus = PENDING`.
3. The Stripe webhook (`charge.refunded`) flips it to SUCCEEDED/FAILED and sets `Booking.isRefunded`.

## Drift rules (added in Phase 8)

- **`requireRole(` must appear in `src/app/(staff)/layout.tsx` and `src/app/(admin)/layout.tsx`.** Enforced by `scripts/drift-check.mjs` after the per-file scan. Missing layout or missing call → verify fails.
- **All existing pattern rules still apply** to the new staff patterns. `useState` is banned in patterns; positioning chrome lives outside `patterns/`.

## Testing

| Surface          | Test approach                                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| `staff.ts` actions | `src/lib/actions/staff.test.ts` — full Vitest suite (19 tests) covering role gating, dev mocks, validation, transaction body, audit log writes. |
| Patterns         | Visual regression deferred — controlled patterns are tested by the page tests they're embedded in. |
| Pages            | Manual smoke test with `DATABASE_URL` unset → renders cockpit, schedule, walk-in, booking detail with mock data. |

When you add a new staff action, mirror the existing test layout: `vi.hoisted` for mocks, default `requireRoleMock` setup in `beforeEach`, and one test per branch (dev-mode, validation rejection, happy path, transaction side effects).

## Deferred

- Reports polish: desktop contact panel, tenant-TZ buckets, export UX — see `staff/05_REPORTS.md`.
- Legacy `/admin/packages/[id]`, `/admin/team/new`, `/admin/team/[id]` — redirect to settings (cleanup open).
- Walk-in manual refunds (cash returned, mark `isRefunded`).
- Booking modification lane editor — see `staff/03_MODIFICATION.md`.
- Stripe Connect OAuth (integrations panel has dashboard URL stub only).
- **Payment resume link UI redesign** — backend shipped: `createPaymentResumeLink({ paymentIntentId })` verifies the PI is owned by a booking in the caller's tenant, then returns `/book/resume-payment?payment_intent=…`. Cockpit `PaymentResumePanel` hidden pending Figma; target: booking detail action or staff tools sheet.

## Reports export

`exportStaffAnalyticsCsvAction` (MANAGER+) returns CSV and writes `AuditLog` `REPORT_EXPORTED`. Metrics: `.claude/staff/05_REPORTS.md`.
