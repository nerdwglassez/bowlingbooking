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

| Area | Route(s) | Notes |
|------|-----------|--------|
| Dashboard | `/staff` | Today’s work, shortcuts ([`app/staff/page.tsx`](../app/staff/page.tsx)) |
| Bookings | `/staff/bookings` -> redirects to calendar; `/staff/bookings/create`; `/staff/bookings/[id]`; `/staff/bookings/[id]/edit` | Canonical full-page detail/edit URLs; legacy `?open=` links redirect |
| Check-in | `/staff/check-in` | Full-page check-in, supports `?bookingId=` |
| Calendar | `/staff/calendar` | Schedule and dispatch view |
| Customers | `/staff/customers`, `/staff/customers/[id]` | Search and customer profile |
| Reports | `/staff/reports` | Export-focused operational reporting |
| Analytics | `/staff/analytics` | Metrics and generated insights (rendered by reports page component) |
| Audit log | `/staff/audit-log` | Visibility into tracked internal actions |
| Pending overrides | `/staff/pending-overrides` | Manager approval queue |
| Settings | `/staff/settings/*` | Lanes, hours, blackout dates, packages, discount codes, pricing, integrations, user/account info |

### Admin app (`/admin`)

| Area | Route(s) |
|------|-----------|
| Home | `/admin` |
| Operating and special hours | `/admin/operating-hours`, `/admin/special-hours` |
| Lane blocks | `/admin/lane-blocks` |
| Packages | `/admin/packages`, `/admin/packages/create`, `/admin/packages/[id]` |
| Products | `/admin/products` and create/edit variants |
| Marketing | `/admin/marketing` |
| Discount codes | `/admin/discount-codes` |
| Settings | `/admin/settings` |
| API keys (partner API) | `/admin/api-keys` |

## Behavioral contract

- Staff pages require authenticated employee access; admin pages enforce stricter `ADMIN` role checks.
- Managers participate in override approval flows (`/staff/pending-overrides`) and related APIs.
- Internal workflows for booking detail/edit/check-in use dedicated full-page routes rather than duplicated modal overlays.
- Discount code lifecycle:
  - Viewable by all authenticated staff roles.
  - Writable/toggleable by admins only.
  - Customer-facing preview/apply remains on public booking APIs.

## APIs most relevant to staff/admin

| Area | Routes (under `app/api/`) |
|------|---------------------------|
| Staff bookings | `staff/bookings/*` (CRUD, today, check-in, override price, approve/reject override) |
| Staff customers | `staff/customers`, `staff/customers/[id]` |
| Staff settings and ops | `staff/settings/*`, `staff/discount-codes`, `staff/pending-overrides`, `staff/reports`, `staff/analytics`, `staff/audit-log` |
| Admin configuration | `admin/operating-hours`, `admin/special-hours`, `admin/lane-blocks`, `admin/recurring-lane-blocks`, `admin/packages`, `admin/products`, `admin/discount-codes`, `admin/settings`, `admin/integrations`, `admin/marketing/*`, `admin/api-keys`, `admin/pos-export` |
| Cron operations | `cron/send-reminders`, `cron/marketing-automation` |
| Partner API (v1) | `v1/openapi`, `v1/bookings` (keys managed under `admin/api-keys`) |

## Edge cases and failure modes

- Unauthorized role access:
  - Trigger: non-employee user hits `/staff/*` or non-admin user hits `/admin/*`.
  - Behavior: server-side auth gate blocks access.
  - Outcome: user is redirected or receives unauthorized API response.
- Legacy modal deep links:
  - Trigger: old `?open=`/intercept entry used.
  - Behavior: request resolves to canonical full-page route where applicable.
  - Outcome: consistent detail/edit/check-in UX.
- Discount code privilege boundaries:
  - Trigger: non-admin attempts create/update.
  - Behavior: API authorization rejects mutation.
  - Outcome: data integrity maintained; read access still available for internal users.

## Security and privacy notes

- Enforce server-side authorization in layouts and APIs (`requireAuth('STAFF')` / `requireAuth('ADMIN')`).
- Internal APIs that mutate booking, pricing, and customer data should remain role-gated and audited.
- Do not place integration secrets or raw keys in UI docs or examples; use placeholder values only.

## Observability and operations

- Track internal operational events through audit log surfaces (`/staff/audit-log`) and related APIs.
- For broader hardening and release checks, see [SECURITY.md](SECURITY.md) and [PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md).

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
