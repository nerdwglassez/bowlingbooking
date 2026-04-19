# Partner API and POS integration

## Purpose

Define integration boundaries for third-party booking/availability consumers and venue POS export behavior.

## Scope

- In scope: partner API key model, supported v1 routes, access controls, POS export stub contract.
- Out of scope: vendor-specific implementation details for a chosen POS provider.
- Linked docs: [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md), [../POS_INTEGRATION.md](../POS_INTEGRATION.md), [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md).

## Contract surface

| Area | Location | Notes |
|------|----------|-------|
| OpenAPI discovery | `app/api/v1/openapi/route.ts` | Documents supported v1 partner endpoints |
| Partner bookings | `app/api/v1/bookings/route.ts` | Read/write booking operations for approved keys/scopes |
| Partner availability | `app/api/v1/availability/route.ts` | Availability access for partner integrations |
| API key management | `app/api/admin/api-keys`, `/admin/api-keys` | Admin-managed key lifecycle and scope controls |
| POS export stub | `app/api/admin/pos-export/route.ts` | Returns 501 until vendor contract is finalized |

## Authentication and authorization

- Partner API requires API key auth (`X-API-Key` or `Bearer`) and scoped access.
- Admin UI/API controls key issuance and revocation.
- POS export endpoints remain admin-restricted until full integration is implemented.

## Failure modes

- Invalid/missing API key -> unauthorized response.
- Insufficient scope -> forbidden response for blocked operations.
- POS vendor not configured -> explicit not-implemented (stub) response.

## Security and privacy notes

- API keys are secrets; never commit real key values in docs, examples, or tests.
- Partner API responses should expose only fields intended for integration use.
- Apply rate limiting and abuse controls on partner-facing endpoints.

## Observability and operations

- Monitor partner API 401/403 and 5xx rates.
- Track API key usage and failed auth patterns.
- Track POS export invocation attempts to prioritize vendor integration requirements.

## Testing and validation

- Validate key auth and scope checks for each partner endpoint.
- Validate admin API key create/rotate/revoke flows.
- Validate explicit behavior for unimplemented POS export endpoints.

## Change log

- 2026-04-12: Added partner API and POS contract documentation.

## When you change behavior

Update this file when partner API scopes/routes, key management, or POS export behavior changes.
