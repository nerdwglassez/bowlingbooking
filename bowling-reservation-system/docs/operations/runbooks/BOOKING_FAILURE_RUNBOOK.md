# Booking failure runbook

## Purpose

Provide a repeatable triage and mitigation process for booking creation and confirmation failures.

## Scope

- In scope: customer booking failures in `/book`, booking create APIs, payment confirm path, availability mismatch errors.
- Out of scope: broad infrastructure outages not specific to booking flow.
- Linked docs: [../../RESERVATION_FLOW.md](../../RESERVATION_FLOW.md), [../../services/PAYMENTS_AND_WEBHOOKS.md](../../services/PAYMENTS_AND_WEBHOOKS.md), [../../services/AVAILABILITY_AND_SCHEDULING.md](../../services/AVAILABILITY_AND_SCHEDULING.md).

## Severity guidance

- **SEV-1:** Booking flow unavailable for most users, sustained API failure, or payment confirms failing platform-wide.
- **SEV-2:** Intermittent booking failures, specific route/API instability, partial payment confirmation failures.
- **SEV-3:** Individual user/account issue not affecting broad traffic.

## Triage checklist

1. Confirm blast radius:
   - Is failure isolated to one route, one package, one role, or all bookings?
   - Are failures concentrated in create booking, payment intent, or confirm-payment?
2. Validate service health:
   - Availability API response shape and latency.
   - Booking create API error rates and response codes.
   - Stripe interaction and webhook processing status.
3. Inspect recent changes:
   - Latest deploys touching booking, pricing, availability, or payment services.
   - Recent configuration changes in env vars or provider dashboards.
4. Capture evidence:
   - Timestamped request IDs, endpoint names, sample anonymized payload patterns.
   - No customer PII, no tokens, no raw secrets in incident notes.

## Common failure patterns and actions

### Pattern A: stale slot / concurrency rejection spikes

- **Likely cause:** availability race conditions under high concurrency.
- **Actions:**
  - Verify availability window and lane block rules.
  - Check recent scheduling/availability logic edits.
  - Communicate user guidance to reselect slots while mitigation is applied.

### Pattern B: payment intent or confirm-payment failures

- **Likely cause:** Stripe key mismatch, webhook drift, transient provider/network errors.
- **Actions:**
  - Validate publishable/secret keys are set in correct environment.
  - Confirm webhook configuration and signature checks.
  - Retry-safe guidance: prevent duplicate charges, ensure idempotent handling.

### Pattern C: booking create rejects valid requests

- **Likely cause:** schema/validation mismatch or pricing payload drift.
- **Actions:**
  - Compare expected request contract with latest service docs.
  - Validate that required fields are present and data types align.
  - Check for recent changes in discount/loyalty/gift-card application behavior.

## Mitigation and recovery

- If caused by recent deploy, rollback or revert to last known stable revision.
- If configuration issue, apply corrected env/config and restart affected service path.
- Re-test with manual smoke flow:
  1. select date/time
  2. complete details/packages
  3. complete payment
  4. verify confirmation and booking record

## Post-incident

- Document root cause, impact, and permanent fix in ADR or incident notes.
- Update:
  - [../../RESERVATION_FLOW.md](../../RESERVATION_FLOW.md) if behavior changed
  - [../../services/PAYMENTS_AND_WEBHOOKS.md](../../services/PAYMENTS_AND_WEBHOOKS.md) or [../../services/AVAILABILITY_AND_SCHEDULING.md](../../services/AVAILABILITY_AND_SCHEDULING.md)
  - [../TESTING_STRATEGY.md](../TESTING_STRATEGY.md) with any new regression checks
