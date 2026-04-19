# Staff, manager, admin, and venue ops

## Purpose

Document the internal employee experience surfaces and contracts across staff, manager, admin, and kiosk workflows.

## Scope

- In scope: authenticated internal routes, access model, internal APIs, and internal UX conventions.
- Out of scope: public customer booking flow (see [RESERVATION_FLOW.md](RESERVATION_FLOW.md)).
- Linked docs: [SHARED_PLATFORM.md](SHARED_PLATFORM.md), [FULL_PAGE_AND_MODAL_FLOWS.md](FULL_PAGE_AND_MODAL_FLOWS.md), [POS_INTEGRATION.md](POS_INTEGRATION.md).

## Internal routes and components

| Area | Location | Notes |
|------|----------|-------|
| Top header | [`components/layout/AppExperienceHeader.tsx`](../components/layout/AppExperienceHeader.tsx) with `variant="staff"` | Used by [`app/staff/layout.tsx`](../app/staff/layout.tsx) and [`app/admin/layout.tsx`](../app/admin/layout.tsx), includes [`StaffHeaderTitle`](../components/layout/StaffHeaderTitle.tsx) and signed-in user block |
| Staff routes | `app/staff/*` | Accessible to `STAFF`, `MANAGER`, and `ADMIN` through `requireAuth('STAFF')` in [`lib/auth.ts`](../lib/auth.ts) |
| Admin routes | `app/admin/*` | Typically `ADMIN` only using `requireAuth('ADMIN')` |
| Kiosk route | [`app/kiosk/check-in/page.tsx`](../app/kiosk/check-in/page.tsx) | Fullscreen check-in UI backed by `app/api/kiosk/check-in` |
| Staff components | `components/staff/*` | Includes booking detail/edit/create/check-in views and wrappers used by staff pages |

## Internal journey map

### Staff app (`/staff`)

| Area              | Route(s)                                                                                                                                  | Notes                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | `/staff`                                                                                                                                  | Today’s work, shortcuts, status filter (Upcoming = `PENDING`/`CONFIRMED`, Checked in = `CHECKED_IN`, Completed = `PAID`/`COMPLETED`) ([`app/staff/page.tsx`](../app/staff/page.tsx)) |
| Bookings          | `/staff/bookings` → redirects to calendar; `/staff/bookings/create`; **`/staff/bookings/[id]`** (detail); **`/staff/bookings/[id]/edit`** | Canonical detail/edit URLs ([`docs/FULL_PAGE_AND_MODAL_FLOWS.md`](FULL_PAGE_AND_MODAL_FLOWS.md)); legacy `?open=` on calendar redirects to detail |
| Check-in          | `/staff/check-in`                                                                                                                         | Full-page check-in (`?bookingId=` supported)                                                                                                      |
| Calendar          | `/staff/calendar`                                                                                                                         | Month schedule view; optional timeline view via `?view=timeline`                                                                                  |
| Customers         | `/staff/customers`, `/staff/customers/[id]`                                                                                               | Search and profile                                                                                                                                |
| Reports           | `/staff/reports`                                                                                                                          | Exports                                                                                                                                           |
| Analytics         | `/staff/analytics`                                                                                                                        | Metrics and insights                                                                                                                              |
| Audit log         | `/staff/audit-log`                                                                                                                        | Activity                                                                                                                                          |
| Pending overrides | `/staff/pending-overrides`                                                                                                                | Manager approval queue                                                                                                                            |
| Settings          | `/staff/settings/*`                                                                                                                       | Lanes, operating hours, blackout dates, packages, discount codes, pricing, integrations, user management, account                                 |

Staff UI building blocks live under **`components/staff/`** (e.g. `BookingDetailsView`, `EditReservationModal`, `CreateBookingModal`, `CheckInModal` patterns in full-page wrappers).

### Admin app (`/admin`)

| Area                      | Route(s)                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| Home                      | `/admin`                                                            |
| Operating & special hours | `/admin/operating-hours`, `/admin/special-hours`                    |
| Lane blocks               | `/admin/lane-blocks`                                                |
| Packages                  | `/admin/packages`, `/admin/packages/create`, `/admin/packages/[id]` |
| Products                  | `/admin/products`, create/edit variants                             |
| Marketing                 | `/admin/marketing`                                                  |
| Discount codes            | `/admin/discount-codes`                                             |
| Settings                  | `/admin/settings`                                                   |
| API keys (partner API)    | `/admin/api-keys`                                                   |

## Behavioral contract

- Staff pages require authenticated employee access; admin pages enforce stricter `ADMIN` role checks.
- Managers participate in override approval flows (`/staff/pending-overrides`) and related APIs.
- Internal workflows for booking detail/edit/check-in use dedicated full-page routes rather than duplicated modal overlays.
- Discount code lifecycle:
  - Viewable by all authenticated staff roles.
  - Writable/toggleable by admins only.
  - Customer-facing preview/apply remains on public booking APIs.

## APIs most relevant to staff/admin

| Area            | Routes (under `app/api/`)                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff bookings  | `staff/bookings/*` (CRUD, today, check-in, override price, approve/reject override)                                                                                                                                                                                                               |
| Staff customers | `staff/customers`, `staff/customers/[id]`                                                                                                                                                                                                                                                         |
| Staff settings  | `staff/settings/*` (includes discount codes UI under `staff/settings/discount-codes`), `staff/discount-codes` (REST: list all staff; POST/PATCH admin-only), `staff/pending-overrides`, `staff/reports`, `staff/analytics`, `staff/audit-log`, `staff/schedule` (timeline-ready schedule payload) |
| Admin config    | `admin/operating-hours`, `admin/special-hours`, `admin/lane-blocks`, `admin/recurring-lane-blocks`, `admin/packages`, `admin/products`, `admin/discount-codes`, `admin/settings`, `admin/integrations`, `admin/marketing/*`, `admin/api-keys`, `admin/pos-export`                                 |
| Crons           | `cron/send-reminders`, `cron/marketing-automation`                                                                                                                                                                                                                                                |

## Testing and validation

- Manual:
  - Verify role-based access behavior across `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`.
  - Validate canonical full-page booking detail/edit/check-in routes from staff surfaces.
  - Confirm admin-only mutations for discount codes and other restricted settings.
- Automated:
  - API authorization tests for protected internal endpoints.
  - Navigation/route tests for canonical staff/admin flows.

## Change log

- 2026-04-12: Reorganized into canonical journey template; preserved route/API references and role contracts.
- 2026-04-12: Updated admin and analytics route notes to reflect direct page rendering (no redirect stubs).

## Related audits and specs

- [STAFF_BOOKING_AND_CSS_AUDIT.md](STAFF_BOOKING_AND_CSS_AUDIT.md)
- [POS_INTEGRATION.md](POS_INTEGRATION.md)
- Component architecture references: [components/README.md](components/README.md), [components/STAFF_COMPONENTS.md](components/STAFF_COMPONENTS.md), [components/LAYOUT_COMPONENTS.md](components/LAYOUT_COMPONENTS.md)

## When you change behavior

Update [`PRD_GAP_ANALYSIS.md`](../PRD_GAP_ANALYSIS.md) and this file so routes, access controls, and APIs remain accurate.
