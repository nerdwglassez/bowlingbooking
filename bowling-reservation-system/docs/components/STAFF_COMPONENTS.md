# Staff components

## Purpose

Document reusable internal UI contracts in `components/staff/*` to keep staff/admin feature work consistent and safe.

## Scope

- In scope: staff booking detail/edit/create/check-in components and supporting internal UI helpers.
- Out of scope: app route-level server logic and API permission rules.
- Linked docs: [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md), [../services/AUTH_AND_ROLES.md](../services/AUTH_AND_ROLES.md).

## Component catalog

| Component | Responsibility | Key states/contracts |
|-----------|----------------|----------------------|
| `BookingDetailsView.tsx` | Full-page booking detail for internal users | Loading/not-found, status badge, check-in action, override workflow, role-sensitive actions |
| `EditReservationModal.tsx` | Reservation editing form used in full-page wrappers | Controlled form state, validation, save/cancel behavior |
| `CreateBookingModal.tsx` | Internal booking creation flow | Search/select customer, booking inputs, submit/cancel states |
| `CheckInModal.tsx` | Internal check-in interaction | Booking lookup, eligibility, success/failure confirmation |
| `CustomerSearch.tsx` | Customer lookup widget | Query state, selection contract, no-results handling |
| `StaffToastListener.tsx` | Staff-focused toast/event bridge | Listens for app events and displays notifications |
| `StaffPageHero.tsx` | Shared heading/summary block for staff pages | Optional action slots, page title consistency |

## Route usage map

| Route surface | Primary components |
|---------------|--------------------|
| `/staff/bookings/[id]` | `BookingDetailsView` |
| `/staff/bookings/[id]/edit` | `EditReservationModal` in full-page wrapper |
| `/staff/bookings/create` | `CreateBookingModal`-style form composition |
| `/staff/check-in` | `CheckInModal` in full-page wrapper |
| `/staff/customers*` | `CustomerSearch` and related customer presentation |

## Behavioral contracts

- Internal mutation actions (check-in, override, edits) are expected to call server APIs that enforce authorization; UI cannot be the sole guard.
- Components should expose clear loading and error states for all async operations.
- Status-driven actions remain explicit:
  - check-in available only for valid statuses (`CONFIRMED`, `PAID`)
  - override actions reflect pending approval states where applicable
- Full-page route wrappers are canonical; avoid introducing parallel modal-only navigation flows.

## Accessibility and UX

- All action buttons must have descriptive labels.
- Status and error messages should be text-based (not color-only).
- Staff critical actions (approve/reject/check-in) should preserve keyboard operability and focus visibility.

## Security and privacy

- Do not display secrets or raw integration keys in staff components.
- Handle customer-identifying data minimally and only where operationally needed.
- Avoid logging personally identifying details in browser console output.

## Change log

- 2026-04-12: Initial component-layer contract doc added.

## When you change behavior

Update this file when any `components/staff/*` contract changes, and also update:

- [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md)
- [../services/AUTH_AND_ROLES.md](../services/AUTH_AND_ROLES.md) when role/access assumptions change
