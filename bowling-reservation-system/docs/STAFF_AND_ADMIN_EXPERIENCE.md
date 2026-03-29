# Staff, manager, admin, and venue ops

Scope: **internal** tools and configuration. Customer booking is documented in [RESERVATION_FLOW.md](RESERVATION_FLOW.md). Shared concepts: [SHARED_PLATFORM.md](SHARED_PLATFORM.md).

## Top header

- **`AppExperienceHeader`** `variant="staff"` in [`app/staff/layout.tsx`](../app/staff/layout.tsx) and [`app/admin/layout.tsx`](../app/admin/layout.tsx): venue + [`StaffHeaderTitle`](../components/layout/StaffHeaderTitle.tsx) (staff and **admin** path titles) + signed-in user (name, role, initials) + Settings.

## Access

- **Staff routes** (`/staff/*`): `STAFF`, `MANAGER`, and `ADMIN` (see [`lib/auth.ts`](../lib/auth.ts) `requireAuth('STAFF')`).
- **Admin routes** (`/admin/*`): typically `ADMIN` only (`requireAuth('ADMIN')`).
- **Managers:** price overrides and pending approvals; see `/staff/pending-overrides` and related APIs.

## Staff app (`/staff`)

| Area | Route(s) | Notes |
|------|-----------|--------|
| Dashboard | `/staff` | Today’s work, shortcuts ([`app/staff/page.tsx`](../app/staff/page.tsx)) |
| Bookings | `/staff/bookings` → redirects to calendar; `/staff/bookings/create`; **`/staff/bookings/[id]`** (detail); **`/staff/bookings/[id]/edit`** | Canonical detail/edit URLs ([`docs/FULL_PAGE_AND_MODAL_FLOWS.md`](FULL_PAGE_AND_MODAL_FLOWS.md)); legacy `?open=` on calendar redirects to detail |
| Check-in | `/staff/check-in` | Full-page check-in (`?bookingId=` supported) |
| Calendar | `/staff/calendar` | Schedule view |
| Customers | `/staff/customers`, `/staff/customers/[id]` | Search and profile |
| Reports | `/staff/reports` | Exports |
| Analytics | `/staff/analytics` | Metrics and insights |
| Audit log | `/staff/audit-log` | Activity |
| Pending overrides | `/staff/pending-overrides` | Manager approval queue |
| Settings | `/staff/settings/*` | Lanes, operating hours, blackout dates, packages, discount codes, pricing, integrations, user management, account |

Staff UI building blocks live under **`components/staff/`** (e.g. `BookingDetailsView`, `EditReservationModal`, `CreateBookingModal`, `CheckInModal` patterns in full-page wrappers).

## Discount codes (promo / corporate)

- **Staff settings UI:** [`/staff/settings/discount-codes`](../app/staff/settings/discount-codes/page.tsx) — listed in [`SettingsNav`](../components/staff/settings/SettingsNav.tsx). All signed-in staff (`STAFF`, `MANAGER`, `ADMIN`) can **view** codes; only **`ADMIN`** can create codes or toggle active/inactive.
- **Admin UI:** [`/admin/discount-codes`](../app/admin/discount-codes/page.tsx) — same data and capabilities for admins (`requireAuth('ADMIN')` on the layout).
- **APIs:** `GET` and `POST` on [`app/api/staff/discount-codes`](../app/api/staff/discount-codes/route.ts) (list: staff; create: admin only); `PATCH` on [`app/api/staff/discount-codes/[id]`](../app/api/staff/discount-codes/[id]/route.ts) (admin only). Parallel admin routes: [`app/api/admin/discount-codes`](../app/api/admin/discount-codes/route.ts) and `admin/discount-codes/[id]` (admin only). Customer booking uses [`app/api/discount-codes/preview`](../app/api/discount-codes/preview/route.ts) and applies codes on booking create.

## Admin app (`/admin`)

| Area | Route(s) |
|------|-----------|
| Home | `/admin` |
| Operating & special hours | `/admin/operating-hours`, `/admin/special-hours` |
| Lane blocks | `/admin/lane-blocks` |
| Packages | `/admin/packages`, `/admin/packages/create`, `/admin/packages/[id]` |
| Products | `/admin/products`, create/edit variants |
| Marketing | `/admin/marketing` |
| Discount codes | `/admin/discount-codes` |
| Settings | `/admin/settings` |
| API keys (partner API) | `/admin/api-keys` |

## Kiosk

- **`/kiosk/check-in`** — Fullscreen check-in for venue kiosks ([`app/kiosk/check-in/page.tsx`](../app/kiosk/check-in/page.tsx)); API `app/api/kiosk/check-in`.

## APIs most relevant to staff/admin

| Area | Routes (under `app/api/`) |
|------|---------------------------|
| Staff bookings | `staff/bookings/*` (CRUD, today, check-in, override price, approve/reject override) |
| Staff customers | `staff/customers`, `staff/customers/[id]` |
| Staff settings | `staff/settings/*` (includes discount codes UI under `staff/settings/discount-codes`), `staff/discount-codes` (REST: list all staff; POST/PATCH admin-only), `staff/pending-overrides`, `staff/reports`, `staff/analytics`, `staff/audit-log` |
| Admin config | `admin/operating-hours`, `admin/special-hours`, `admin/lane-blocks`, `admin/recurring-lane-blocks`, `admin/packages`, `admin/products`, `admin/discount-codes`, `admin/settings`, `admin/integrations`, `admin/marketing/*`, `admin/api-keys`, `admin/pos-export` |
| Crons | `cron/send-reminders`, `cron/marketing-automation` |

## Partner API (v1)

- **OpenAPI:** `app/api/v1/openapi/route.ts`
- **Bookings:** `app/api/v1/bookings/route.ts`
- **Keys:** managed in admin API Keys UI + `app/api/admin/api-keys`

## UX note: modals vs full page

Staff check-in, booking detail, and booking edit use **dedicated full-page routes** (no overlay duplicate of the same detail UI). Admin package create/edit are full-page only; old `@modal` intercept routes were removed. Details: [FULL_PAGE_AND_MODAL_FLOWS.md](FULL_PAGE_AND_MODAL_FLOWS.md).

## Related audits and specs

- [STAFF_BOOKING_AND_CSS_AUDIT.md](STAFF_BOOKING_AND_CSS_AUDIT.md)
- POS stub: [POS_INTEGRATION.md](POS_INTEGRATION.md)

## When you change behavior

Update [`PRD_GAP_ANALYSIS.md`](../PRD_GAP_ANALYSIS.md) and this file so routes and APIs stay accurate.
