# Component-to-route matrix

## Purpose

Provide an impact map from user-facing routes to major component groups so changes can be reviewed safely.

## Scope

- In scope: high-traffic customer, staff, admin, and kiosk routes with primary component dependencies.
- Out of scope: every small utility component usage.
- Linked docs: [README.md](README.md), [BOOKING_COMPONENTS.md](BOOKING_COMPONENTS.md), [STAFF_COMPONENTS.md](STAFF_COMPONENTS.md), [LAYOUT_COMPONENTS.md](LAYOUT_COMPONENTS.md).

## Route to component mapping

| Route area | Primary components | Secondary dependencies |
|------------|--------------------|------------------------|
| `/book` | `components/booking/DateAndTimeStepOne`, `BookingSummary`, `PackageSelection`, `StripePaymentForm`, `GuestCheckout` | `components/layout/AppExperienceHeader` (`variant="booking"`), `components/ui/*` |
| `/book/confirmation` | Confirmation page UI + booking summary primitives | `components/layout/AppExperienceHeader` (`variant="booking"`) |
| `/bookings`, `/bookings/[id]`, `/bookings/[id]/reschedule` | Booking list/detail/reschedule page components | `components/layout/AppExperienceHeader`, `components/ui/*` |
| `/dashboard`, `/profile`, `/gift-cards`, `/waitlist/claim` | Customer page-specific components | `components/layout/AppExperienceHeader`, `components/ui/*` |
| `/staff` and staff subroutes | `components/staff/BookingDetailsView`, `EditReservationModal`, `CreateBookingModal`, `CheckInModal`, `StaffPageHero` | `components/layout/AppExperienceHeader` (`variant="staff"`), `components/layout/ImmersiveStaffPage`, `components/ui/*` |
| `/admin` and admin subroutes | Admin page-specific forms/tables plus shared staff settings patterns | `components/layout/AppExperienceHeader` (`variant="staff"`), `components/ui/*` |
| `/kiosk/check-in` | Kiosk page check-in experience | Kiosk API + form primitives as used |

## Change impact guidance

- If a route behavior changes, update this matrix when component dependencies shift.
- If a core component changes contract (props/state/error handling), review all routes listed here before merge.
- Keep entries at domain level; avoid overfitting to transient implementation details.

## Security and privacy notes

- Avoid route examples containing customer identifiers, tokens, or internal IDs from production.
- Use placeholder route params in docs (`[id]`, `<token>`) only.

## When you change behavior

Update:

- [README.md](README.md)
- [BOOKING_COMPONENTS.md](BOOKING_COMPONENTS.md) or [STAFF_COMPONENTS.md](STAFF_COMPONENTS.md) when contracts change
- [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md) and [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md) for journey-level behavior
