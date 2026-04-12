# Auth and roles service contract

## Purpose

Define authentication/session behavior and role-based access contracts used across customer and employee surfaces.

## Scope

- In scope: session lifecycle, auth APIs, role checks, 2FA, and route/API access constraints.
- Out of scope: booking domain logic and pricing computations.
- Linked docs: [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md), [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md), [../SECURITY.md](../SECURITY.md).

## Interfaces

| Interface | Location | Contract |
|-----------|----------|----------|
| Session cookie policy | [`lib/session-cookie.ts`](../../lib/session-cookie.ts) | Central source for cookie name/options (`HttpOnly`, `Secure` in prod, `SameSite=Lax`) |
| Auth helpers | [`lib/auth.ts`](../../lib/auth.ts) | `getSession()` and `requireAuth(role)` enforce server-side checks |
| Auth APIs | `app/api/auth/*` | Login/logout/register/guest register/forgot-reset/me/2FA setup-verify-disable-confirm |
| Customer auth pages | `app/login`, `app/register`, `app/forgot-password`, `app/reset-password` | Public entry points for account auth flows |

## Role model and access boundaries

- Prisma role set: `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`.
- `requireAuth('STAFF')` allows `STAFF`, `MANAGER`, and `ADMIN`.
- `requireAuth('ADMIN')` is strict admin-only access for sensitive internal config routes.
- Customer-only pages should redirect employee roles to internal equivalents when appropriate.

## Behavioral contract

- Session token must be validated server-side on all protected routes/APIs.
- Authentication decisions must not rely only on client state.
- Password reset tokens are single-use and time-bound.
- 2FA setup/verify/disable must be scoped to the authenticated user and not leak secret material.

## Failure modes and controls

- Invalid or expired session:
  - Behavior: require re-authentication and deny protected API mutations.
- Privilege escalation attempt:
  - Behavior: server-side role checks reject access regardless of client UI state.
- Password reset replay:
  - Behavior: token invalidation prevents re-use after successful reset.

## Security and observability

- Avoid exposing auth secrets, token values, or reset links in logs.
- Rate-limit auth endpoints and monitor abuse signals (failed login/reset attempts).
- Review auth changes with security reviewer per [../governance/DOC_OWNERS.md](../governance/DOC_OWNERS.md).

## Validation checklist

- Verify `CUSTOMER`, `STAFF`, `MANAGER`, and `ADMIN` route/API boundaries manually.
- Verify logout invalidates session for subsequent requests.
- Verify forgot/reset flow works once and fails on token re-use.
