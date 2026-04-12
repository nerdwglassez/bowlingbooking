# Testing strategy (reservation platform)

## Purpose

Define a practical testing strategy aligned to customer reservation flow, employee tools, and shared services so releases can scale safely.

## Scope

- In scope: test layers, domain ownership, minimum release checks, regression focus areas.
- Out of scope: framework-specific test runner implementation details.
- Linked docs: [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md), [../services/README.md](../services/README.md).

## Test layers

| Layer | Goal | Typical coverage |
|------|------|------------------|
| Unit | Validate pure logic correctness | Pricing math, availability calculations, role helper logic, parsing/validation helpers |
| API integration | Validate route behavior and auth/validation contracts | `app/api/*` request/response shape, role checks, error handling |
| Journey/E2E | Validate real user outcomes | `/book` checkout path, `/bookings` manage flow, `/staff` key operations |
| Operational verification | Validate environment/release readiness | Build, security scan, critical smoke tests on deployed target |

## Domain testing priorities

### Customer reservation flow

- Happy path booking (guest + signed-in).
- Payment failure/retry behavior.
- Discount/gift-card/loyalty interaction correctness.
- Booking ownership and access control (`/bookings/[id]`).

### Employee experience

- Role gating (`CUSTOMER` blocked from staff/admin routes).
- Staff booking detail/edit/check-in canonical routes.
- Manager override approval/rejection behavior.
- Admin-only mutation paths (settings, discount code writes, API key management).

### Shared services

- Auth/session lifecycle.
- Availability slot generation and conflict handling.
- Pricing and discount application invariants.
- Notification and cron secret enforcement.

## Minimum release gate

Before merge to main for behavior changes:

1. Build passes (`npm run build`).
2. Domain tests for changed areas pass.
3. Required docs updated (governance checklist).
4. Secret hygiene scan completed (placeholders only).
5. Manual smoke checks on affected user journeys.

## Regression matrix ownership

| Domain | Primary test owner | Secondary owner |
|--------|--------------------|-----------------|
| Customer flow | Product + Frontend | Platform backend |
| Staff/admin | Product + Ops tools | Platform backend |
| Shared services | Platform backend | Product + Frontend |
| Security/ops checks | Platform backend + DevOps | Engineering lead |

## When you change behavior

Update this strategy when:

- A new high-risk domain is added (e.g., new payment mode/integration).
- Release gates change.
- Responsibility ownership changes materially.
