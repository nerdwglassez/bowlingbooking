# Availability and scheduling service contract

- **Class:** Canonical
- **Owner:** Platform backend
- **Last reviewed:** 2026-04-12
- **Update trigger:** Changes to operating hours, special hours, lane blocks, slot generation, or availability APIs.

## Purpose

Define the contract for slot calculation and scheduling constraints used by customer and internal reservation workflows.

## Scope

- In scope: availability computation, scheduling constraints, lane block effects, and API dependencies.
- Out of scope: payment, pricing arithmetic, and customer profile behavior.
- Linked docs: [SHARED_PLATFORM.md](../SHARED_PLATFORM.md), [RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md).

## Core implementation

| Area | Location | Notes |
|------|----------|-------|
| Availability logic | [`lib/availability.ts`](../../lib/availability.ts) | Source of truth for slot generation and schedule checks |
| Public availability API | [`app/api/availability/route.ts`](../../app/api/availability/route.ts) | Used by customer booking flow |
| Admin inputs | `app/api/admin/operating-hours`, `app/api/admin/special-hours`, `app/api/admin/lane-blocks`, `app/api/admin/recurring-lane-blocks` | Admin-managed data that affects computed availability |

## Behavioral contract

- Slot availability must respect:
  - regular operating hours
  - special hour overrides
  - one-time and recurring lane blocks
  - package/time constraints applied by booking flow
- Customer and staff booking flows should see a consistent schedule model.
- Availability responses should be deterministic for identical input and state.

## Failure modes and handling

- **Invalid date/time input**
  - Behavior: validation rejects request.
  - Outcome: caller receives actionable error.
- **Conflicting schedule data**
  - Behavior: conservative availability result (fewer available slots) rather than overbooking.
  - Outcome: temporary reduced availability until data corrected.
- **Race with booking creation**
  - Behavior: create booking re-validates slot at write time.
  - Outcome: stale slot selection is rejected safely.

## Security and privacy notes

- Availability is public-facing but must still validate inputs and throttle abuse-prone access.
- Admin schedule mutation endpoints must enforce admin authorization.
- Do not expose internal IDs or debug metadata that reveal unnecessary internal structure.

## Observability

- Track rate of availability request failures and invalid input rejection.
- Monitor booking-create rejections due to stale slot selection.
- Alert on unusual spikes in availability requests to detect abuse.

## Validation checklist

- Changing scheduling logic requires:
  - [ ] update this contract doc
  - [ ] verify customer `/book` step 1 behavior
  - [ ] verify internal booking create/check-in date handling
  - [ ] update [PRD_GAP_ANALYSIS.md](../../PRD_GAP_ANALYSIS.md) if user-visible behavior changes

