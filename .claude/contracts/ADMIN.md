# ADMIN.md — Contract for the admin settings shell

Status: locked for Phase 9 (v1 critical path). Promo codes / booking-policy UI / integrations panel are deferred to Phase 10.

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
| Server actions                   | `src/lib/actions/admin.ts`                                     |
| Form patterns                    | `src/components/patterns/{venue-details-form,operating-hours-editor,package-form,user-form}.tsx` |

## Hard rules

1. **Auth lives in the route-group layout.** `(admin)/layout.tsx` MUST call `requireRole('MANAGER', 'ADMIN')`. Pages NEVER call it for auth gating — only to retrieve the current user's identity/role for in-page decisions (e.g. "can this caller assign the ADMIN role?"). The drift sentinel fails verify if the layout omits the check.

2. **Server actions enforce role independently.** Every export in `src/lib/actions/admin.ts` starts with `await requireRole('MANAGER', 'ADMIN')`, except `listAuditLogs`, which is **ADMIN-only** (`await requireRole('ADMIN')`) — see [Audit log viewer](#audit-log-viewer). The layout gates the UI; the server action gates the call. Both are required because a client can still invoke a server action directly.

3. **ADMIN role can only be assigned by an ADMIN.** `createTeamUserAction` and `updateTeamUserAction` enforce this via `requireCanAssignRole(caller, targetRole)`. MANAGERs can create/edit STAFF or MANAGER, but cannot promote anyone to ADMIN.

4. **No self-mutations.** A user cannot change their own role or deactivate themselves. The server action throws; the UI hides the "Deactivate" affordance when `targetId === callerId`.

5. **Packages are archived, never deleted.** `archivePackageAction` flips `active` to false. Existing bookings keep their package reference, so historical data stays intact.

6. **Users are deactivated, never deleted.** `deactivateTeamUserAction` demotes role to `CUSTOMER` and nulls `passwordHash`. They vanish from the team list (which filters role IN STAFF/MANAGER/ADMIN), can't sign in via Credentials, but `Booking.userId` references remain valid.

7. **Patterns are controlled, no `useState`.** Every form pattern (`VenueDetailsForm`, `OperatingHoursEditor`, `PackageForm`, `UserForm`) takes `values + onChange`. State lives on the page-level client island. The drift sentinel enforces this.

8. **Audit every mutation.** Every write in `admin.ts` appends an `AuditLog` row in the same `prisma.$transaction`. Action types: `TENANT_UPDATED`, `OPERATING_HOURS_UPDATED`, `PACKAGE_CREATED`, `PACKAGE_UPDATED`, `PACKAGE_ARCHIVED`, `TEAM_USER_CREATED`, `TEAM_USER_UPDATED`, `TEAM_USER_PASSWORD_RESET`, `TEAM_USER_DEACTIVATED`. Each carries `userId` of the admin and identifying details — never the full input blob (Prisma's `Json` type rejects typed interfaces without index signatures; we keep only the salient scalars).

9. **Dev-without-DB returns mocks, never throws.** Every read returns deterministic mock data when `isDevWithoutDb()` is true. Writes log to console and return a synthesized id with `mocked: true`. The full admin surface is clickable without Postgres for design review.

10. **Email is not the trust boundary.** Team-member invites use admin-set initial passwords (told out of band). No email magic links in v1. This keeps the auth model identical to the customer Credentials flow.

## Lifecycle: team-member create

```
Admin opens /admin/team/new
  ↓
TeamEditor (client) loads form values
  ↓
User submits → createTeamUserAction
  ↓
requireRole(MANAGER, ADMIN)
  ↓
requireCanAssignRole(caller, input.role)   // ADMIN-only check
  ↓
validate email format + password length
  ↓
hashPassword(initialPassword)
  ↓
prisma.$transaction([
  User.create({ email, role, passwordHash, … }),
  AuditLog.create({ action: 'TEAM_USER_CREATED', … }),
])
  ↓
revalidatePath('/admin/team')
  ↓
router.push(`/admin/team/${result.userId}`)
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

## Drift rules

No new sentinel rules in Phase 9. The Phase 8 `route-group layout guard` already enforces `requireRole(` in `(admin)/layout.tsx`. All existing pattern rules apply to the new admin patterns (controlled, no `useState`, no chrome positioning, etc.).

## Testing

| Surface          | Test approach                                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| `admin.ts` actions | `src/lib/actions/admin.test.ts` — Vitest tests covering role gating, ADMIN-assignment guard, validation, transaction body, audit-log writes, self-mutation refusal, and `listAuditLogs` (ADMIN-only, paging, filters, user join). |
| Patterns         | Controlled patterns tested via the page tests they're embedded in (no separate unit tests). |
| Pages            | Manual smoke test with `DATABASE_URL` unset → admin pages render with mock data. |

When you add a new admin action, mirror the existing test layout: `vi.hoisted` for mocks, default `requireRoleMock` setup in `beforeEach`, and one test per branch (dev-mode, validation, happy path, transaction side effects, self-mutation refusal where relevant).

## Audit log viewer

### Route

`/admin/audit` — read-only, ADMIN role only.

### Why ADMIN-only

Audit logs can contain PII in the `details` JSON column (cancelled booking emails, refund reasons). Restricting to ADMIN keeps blast radius small. MANAGER can view bookings + refunds + walk-ins through the normal pages; the audit log adds nothing they need for daily ops.

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

## Deferred

- **Promo codes** — needs a `PromoCode` model (not in schema) + customer-side application logic.
- **Booking-policy UI** — `Tenant.config` JSON blob is the eventual home for advance-booking-window, cancellation-cutoff, deposit %. v1 surfaces only `holdTimeoutMins` and `maxOnlineBowlers`.
- **Integrations panel** — read-only status for Stripe / Resend / NextAuth secrets. Key rotation stays deploy-time only.
- **Branding** — tenant-specific theme colors per `Tenant.themeSlug`. v1 ships one theme.
- **Reports / analytics** — Phase 10+.
- **Walk-in manual refunds** — mark `Booking.isRefunded = true` + AuditLog. Deferred from Phase 8.
