# Full-page staff booking flows (single canonical routes)

Staff **reservation details** and **edit** use **one URL each**—no duplicate modal overlay for the same content. Links and redirects go to these routes.

## Reservation details

| Route | Implementation |
|--------|----------------|
| **`/staff/bookings/[id]`** | Full-page [`BookingDetailsView`](../components/staff/BookingDetailsView.tsx) (check-in, override price, link to edit). |

- **Entry points:** Staff dashboard (Actions → Details), calendar day list (click a booking), pending overrides, customer history, after create booking.
- **Legacy:** `/staff/calendar?open=<id>` redirects to `/staff/bookings/<id>`.

## Edit reservation

| Route | Implementation |
|--------|----------------|
| **`/staff/bookings/[id]/edit`** | Full-page [`EditReservationModal`](../components/staff/EditReservationModal.tsx) (same form as before; no duplicate modal on dashboard). |

- **Entry points:** Staff dashboard (Actions → Edit Reservation), “Edit reservation” on the detail page.

## Check-in

| Route | Implementation |
|--------|----------------|
| **`/staff/check-in`** | Full-page wrapper around [`CheckInModal`](../components/staff/CheckInModal.tsx); optional `?bookingId=` |

- **Entry points:** Staff dashboard (Actions → Check In) uses `/staff/check-in?bookingId=…`.

## Other

- **`/staff/bookings`** (list) redirects to **`/staff/calendar`** (calendar is the schedule hub).
- **`CreateBookingModal`:** Still a modal for creating a booking; after success, navigates to **`/staff/bookings/<id>`** (detail page).

## Admin (Packages)

Create package and Edit package use **full-page routes** only. The former intercepting modal routes under `app/admin/packages/@modal/...` have been removed.

## Removed (historical)

- Intercepting routes under `app/staff/@modal/(.)check-in` and `app/staff/@modal/(.)bookings` were removed earlier.
- Dashboard/calendar **overlay modals** for the same booking detail/edit/check-in UI were removed in favor of the routes above.
