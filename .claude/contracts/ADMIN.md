# ADMIN.md — Contract for the admin settings shell

Status: locked. Canonical manager settings live under `/staff/settings/*`; legacy `/admin/*` list routes redirect; audit log remains at `/admin/audit`.

## Settings implementation map (canonical)

| Surface | Canonical route | Legacy redirect |
|---------|-----------------|-----------------|
| Settings hub | `/staff/settings` | `/admin` index |
| Venue info | `/staff/settings/venue` | `/admin/venue` → venue |
| Operating hours | `/staff/settings/hours` | (was on `/admin/venue`) |
| Pricing + rate overrides | `/staff/settings/pricing` | — |
| Booking policies | `/staff/settings/policies` | — |
| Packages (unified + code-gated) | `/staff/settings/packages` | `/admin/packages`, `/admin/promos` |
| Team | `/staff/settings/team` | `/admin/team` redirects; legacy `/admin/team/new`, `/admin/team/[id]` editors remain |
| Integrations | `/staff/settings/integrations` | Add/connect panel, enable toggle, view details + remove; Stripe Connect OAuth return |
| Profile | `/staff/settings/profile` | — |
| Audit log | `/admin/audit` | ADMIN only |
| Admin KPI reports | `/admin/reports` | ADMIN only |

## Where things live

| Concern                          | Lives in                                                       |
| -------------------------------- | -------------------------------------------------------------- |
| Route group + auth gating        | `src/app/(admin)/layout.tsx` — calls `requireRole('MANAGER', 'ADMIN')` |
| App shell (sidebar / top bar)    | `src/components/chrome/app-shell.tsx` (shared with `(staff)`) |
| Navigation chrome                | `src/components/chrome/nav-rail.tsx`                           |
| Settings index                   | `src/app/(admin)/admin/page.tsx`                               |
| Venue page (tenant + hours)      | `src/app/(admin)/admin/venue/{page,venue-details-panel,operating-hours-panel}.tsx` |
| Packages list / new / edit       | `src/app/(admin)/admin/packages/{page,package-editor,new/page,[id]/page}.tsx` |
| Team list / new / edit           | `src/app/(admin)/admin/team/{page,team-editor,new/page,[id]/page}.tsx` |
| Audit log (read-only)            | `src/app/(admin)/admin/audit/page.tsx`                         |
| Reports (read-only)              | `src/app/(admin)/admin/reports/{page,kpi-tiles,reports-charts}.tsx` |
| Server actions                   | `src/lib/actions/admin.ts`                                     |
| Form patterns                    | `src/components/patterns/{venue-details-form,operating-hours-editor,package-form,user-form}.tsx` |

## Hard rules

1. **Auth lives in the route-group layout.** `(admin)/layout.tsx` MUST call `requireRole('MANAGER', 'ADMIN')`. Pages NEVER call it for auth gating — only to retrieve the current user's identity/role for in-page decisions (e.g. "can this caller assign the ADMIN role?"). The drift sentinel fails verify if the layout omits the check.

2. **Server actions enforce role independently.** Every export in `src/lib/actions/admin.ts` starts with `await requireRole('MANAGER', 'ADMIN')`, except `listAuditLogs` and `getReportsSummary`, which are **ADMIN-only** (`await requireRole('ADMIN')`) — see [Audit log viewer](#audit-log-viewer) and [Reports viewer](#reports-viewer-phase-11). The layout gates the UI; the server action gates the call. Both are required because a client can still invoke a server action directly.

3. **ADMIN role can only be assigned by an ADMIN.** `createTeamUserAction` and `updateTeamUserAction` enforce this via `requireCanAssignRole(caller, targetRole)`. MANAGERs can create/edit STAFF or MANAGER, but cannot promote anyone to ADMIN.

4. **No self-mutations.** A user cannot change their own role or deactivate themselves. The server action throws; the UI hides the "Deactivate" affordance when `targetId === callerId`.

5. **Packages are archived, never deleted.** `archivePackageAction` flips `active` to false. Existing bookings keep their package reference, so historical data stays intact.

6. **Users are deactivated, never deleted.** `deactivateTeamUserAction` demotes role to `CUSTOMER` and nulls `passwordHash`. They vanish from the team list (which filters role IN STAFF/MANAGER/ADMIN), can't sign in via Credentials, but `Booking.userId` references remain valid.

7. **Patterns are controlled, no `useState`.** Every form pattern (`VenueDetailsForm`, `OperatingHoursEditor`, `PackageForm`, `UserForm`) takes `values + onChange`. State lives on the page-level client island. The drift sentinel enforces this.

8. **Audit every mutation.** Every write in `admin.ts` appends an `AuditLog` row in the same `prisma.$transaction`. Action types: `TENANT_UPDATED`, `OPERATING_HOURS_UPDATED`, `PACKAGE_CREATED`, `PACKAGE_UPDATED`, `PACKAGE_ARCHIVED`, `TEAM_USER_CREATED`, `TEAM_USER_UPDATED`, `TEAM_USER_PASSWORD_RESET`, `TEAM_USER_DEACTIVATED`, `TEAM_USER_INVITE_ACCEPTED`, `TEAM_USER_INVITE_RESENT`. Each carries `userId` of the admin and identifying details — never the full input blob (Prisma's `Json` type rejects typed interfaces without index signatures; we keep only the salient scalars).

9. **Dev-without-DB returns mocks, never throws.** Every read returns deterministic mock data when `isDevWithoutDb()` is true. Writes log to console and return a synthesized id with `mocked: true`. The full admin surface is clickable without Postgres for design review.

10. **Team invites use email magic links.** Admin enters email + role (+ optional message). `createTeamUserAction` creates a pending user (`passwordHash: null`), issues a `TeamInviteToken` (48h TTL), and sends `sendTeamInviteEmail`. The employee sets their password at `/accept-invite`. Duplicate emails (including existing customers) are rejected. Pending users can be resent via `resendTeamInviteAction`.

## Lifecycle: team-member create

```
Admin opens /staff/settings/team → Invite sheet
  ↓
User submits → createTeamUserAction
  ↓
requireRole(MANAGER, ADMIN)
  ↓
requireCanAssignRole(caller, input.role)   // ADMIN-only check
  ↓
validate email format
  ↓
prisma.$transaction([
  User.create({ email, role, passwordHash: null, … }),
  TeamInviteToken.create({ … }),
  AuditLog.create({ action: 'TEAM_USER_CREATED', … }),
])
  ↓
sendTeamInviteEmail({ inviteUrl: /accept-invite?token=… })
  ↓
revalidatePath('/staff/settings/team')
```

## Lifecycle: team-member accept invite

```
Employee opens /accept-invite?token=…
  ↓
acceptTeamInviteAction({ token, password })
  ↓
validate token (unused, unexpired) + staff role
  ↓
prisma.$transaction([
  User.update({ passwordHash }),
  TeamInviteToken.update({ usedAt }),
  AuditLog.create({ action: 'TEAM_USER_INVITE_ACCEPTED', … }),
])
  ↓
Employee signs in at /signin?from=/staff
```

## Lifecycle: package archive

```
Admin clicks "Archive" on /admin/packages/[id]
  ↓
archivePackageAction → requireRole → prisma.$transaction([
  Package.update({ active: false }),
  AuditLog.create({ action: 'PACKAGE_ARCHIVED' }),
])
  ↓
revalidatePath('/admin/packages')
  ↓
router.push('/admin/packages')   // list view re-fetches
```

Customers no longer see the package in `getPackagesForTenant` (which filters `active: true`). Existing bookings keep their reference because we never delete.

## Lifecycle: operating-hours edit

```
Admin opens /admin/venue
  ↓
OperatingHoursPanel ensures all 7 days exist client-side (fills gaps with defaults)
  ↓
User submits → updateOperatingHoursAction
  ↓
validate: 7 rows + HH:MM format (closed days skip time validation)
  ↓
prisma.$transaction([
  OperatingHours.deleteMany({ tenantId }),
  OperatingHours.createMany({ data: 7 rows }),
  AuditLog.create({ action: 'OPERATING_HOURS_UPDATED' }),
])
```

We replace all 7 rows in a single transaction rather than diffing — simpler and atomic.

## Booking policy (Phase 11)

The Venue page now also edits the customer cancellation policy:

| Field                       | Storage              | Default | Range  |
| --------------------------- | -------------------- | ------- | ------ |
| `holdTimeoutMins`           | `Tenant` column      | 10      | 1..60  |
| `maxOnlineBowlers`          | `Tenant` column      | 18      | 1..36  |
| `cancellationWindowHours`   | `Tenant.config` JSON | 24      | 0..240 |
| `cancellationRefundPercent` | `Tenant.config` JSON | 100     | 0..100 |

The cancellation values live in `Tenant.config` (not as new columns) because they're per-tenant policy knobs — schema-less is fine and we avoid a migration. `updateTenantAction` reads the existing config row inside the transaction and merges the two policy keys without disturbing anything else (e.g. other future JSON keys survive an unrelated venue edit).

Server-side reads:

- Admin path → `getTenantForAdmin` returns the values directly on `AdminTenantDetail`, defaulted from the same constants used by the customer-facing helper.
- Customer path → `getCancellationPolicy(tenant)` in `src/lib/tenant.ts` is unchanged; it reads the same keys.

Both readers fall back to the defaults when the config row is missing or out-of-range, so a half-configured tenant always behaves like the v1 default rather than crashing.

### Branding (Phase 11)

- **`Tenant.themeSlug`** drives the visual rebrand (preset name, not free-form CSS). It is a **top-level Prisma column** — not stored in `Tenant.config`.
- The canonical preset list lives in **`src/lib/themes.ts`** (`THEME_PRESETS`, `isValidThemeSlug`, `getThemePreset`). Unknown slugs saved in the DB are treated as **`default`** at render time (`data-theme-preset` on `<html>`); the admin save path rejects unknown slugs.
- Each preset is a CSS file under **`src/styles/themes/`** keyed by **`[data-theme-preset="<slug>"]`** (set on `<html>` in the root layout, orthogonal to **`data-theme`** for light/dark).
- **Adding a preset:** add the CSS file (override only `--color-action*` and optionally `--surface-dark`), append an entry to `THEME_PRESETS`, and add an `@import` in `src/app/globals.css`. The drift sentinel does not scan `.css` files for raw hex; theme files may use hex literals there only.
- **Cancellation policy and theme preset** both ride **`updateTenantAction`** — one **Save venue details** button on `/admin/venue`.

## Drift rules

No new sentinel rules in Phase 9. The Phase 8 `route-group layout guard` already enforces `requireRole(` in `(admin)/layout.tsx`. All existing pattern rules apply to the new admin patterns (controlled, no `useState`, no chrome positioning, etc.).

## Testing

| Surface          | Test approach                                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| `admin.ts` actions | `src/lib/actions/admin.test.ts` — Vitest tests covering role gating, ADMIN-assignment guard, validation, transaction body, audit-log writes, self-mutation refusal, `listAuditLogs` (ADMIN-only, paging, filters, user join), and `getReportsSummary` (ADMIN-only, range normalization, aggregation, top packages cap, empty window). |
| Patterns         | Controlled patterns tested via the page tests they're embedded in (no separate unit tests). |
| Pages            | Manual smoke test with `DATABASE_URL` unset → admin pages render with mock data. |

When you add a new admin action, mirror the existing test layout: `vi.hoisted` for mocks, default `requireRoleMock` setup in `beforeEach`, and one test per branch (dev-mode, validation, happy path, transaction side effects, self-mutation refusal where relevant).

## Audit log viewer

### Route

`/admin/audit` — read-only, ADMIN role only.

### Why ADMIN-only

Audit rows are tenant-scoped via `AuditLog.tenantId` for tenant-bound ADMIN users. Platform ADMIN (`tenantId == null`) may read across tenants. Audit logs can contain PII in the `details` JSON column (cancelled booking emails, refund reasons). Restricting to ADMIN keeps blast radius small. MANAGER can view bookings + refunds + walk-ins through the normal pages; the audit log adds nothing they need for daily ops.

### Filters

- action (known enum-ish set from server)
- entityType (Booking | Tenant | Package | User | BlockedSlot)
- date range
- page / pageSize (max 200; values above 200 are clamped)

### Schema

Reads `AuditLog` rows ordered by `createdAt` DESC. User name + email are joined via a second query (no relation defined on AuditLog).

### What's NOT in scope

- Export to CSV (Phase 11+)
- Search inside `details` JSON (Phase 11+)
- Real-time tail (Phase 11+)

## Reports viewer (Phase 11)

### Route

`/admin/reports` redirects to `/staff/reports`. Live analytics/contacts are **MANAGER+** under `/staff/reports` (see `.claude/staff/05_REPORTS.md`).

### Metric dictionary (shared with staff reports)

- **Gross revenue** — paid CONFIRMED/COMPLETED `Booking.totalAmount` (integer cents).
- **Refund total** — succeeded `Payment.refundAmount` in the same window (not netted from gross in KPI tiles that show both).
- **Net revenue** — gross minus succeeded refunds (floored at 0); exposed on staff analytics summary + CSV.
- **Source mix** — ONLINE / WALK_IN / PHONE paid booking counts and revenue.
- **Timezone** — window edges and daily buckets use `Tenant.timezone` via `staff-report-metrics`.
- **Export audit** — `exportStaffAnalyticsCsvAction` writes `REPORT_EXPORTED`.

Audit log remains ADMIN-only.

### Why ADMIN-only

Revenue and refund aggregates are sensitive financial summaries. MANAGER continues to operate bookings, refunds, and walk-ins on staff surfaces; the reports page is an executive slice reserved for ADMIN.

### Range

- Query string `?range=7d` | `?range=30d` | `?range=90d`; invalid or missing values fall back to **`30d`** (server action is canonical).
- Window: **UTC calendar days** from the start of **(today − N + 1)** through the end of **today** (inclusive), where N is 7, 30, or 90. Daily chart buckets use the **UTC date** of `Booking.startTime`. **Trade-off:** true tenant-local midnight boundaries are deferred (documented here and in `getReportsSummary` in `admin.ts`).

### Charts (v1)

- **KPI tiles:** gross revenue (cents), paid booking count, refund total, average booking value (`formatPrice` in UI).
- **Line chart:** gross revenue per day (paid CONFIRMED + COMPLETED only).
- **Bar chart:** same paid booking count per day.
- **Top packages:** top **5** packages by gross revenue (table). Client chart island uses **`recharts`**; strokes/fills use CSS variables only.

### Server aggregation

`getReportsSummary` loads matching rows inside a single **`prisma.$transaction`** so the booking list and refund aggregate see a consistent snapshot.

**Paid booking:** `status IN ('CONFIRMED','COMPLETED')`, optional `payment` with `status` in **`succeeded`** (Stripe) or **`cash`** (walk-in). Gross revenue is the sum of **`Booking.totalAmount`** over that set (integer cents).

**Refunds:** **`refundTotalCents`** is the sum of **`Payment.refundAmount`** where **`refundStatus = SUCCEEDED`**, for payments whose **booking `startTime`** falls in the same window. This is **gross refunded amount**; it is **not** subtracted from **`grossRevenueCents`** (gross stays gross).

### Read path auditing

Read-only report loads are **not** written to `AuditLog` (too noisy for v1).

### Deferred (reports)

- CSV export, custom date range, comparison to previous period
- Tenant-timezone-correct daily buckets and window edges
- Manager-visible read replica of reports

## Deferred

- **Stripe Connect OAuth** — `getStripeConnectOnboardingUrl()` redirects to Stripe Connect onboarding and returns to Integrations (`?stripe=return|refresh`).
- **Advance booking policy** — deposit %, advance-booking window, and other `Tenant.config` knobs beyond cancellation window / refund % (see [Booking policy (Phase 11)](#booking-policy-phase-11)).
- **Deeper analytics** — cohorting, warehouse sync, and exports beyond the v1 `/staff/reports` KPIs and charts.
- **Legacy admin editors** — redirect `/admin/packages/[id]`, `/admin/team/*` to settings equivalents.
