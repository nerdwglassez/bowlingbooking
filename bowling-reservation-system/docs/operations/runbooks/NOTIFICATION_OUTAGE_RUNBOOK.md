# Notification outage runbook (email/SMS/cron)

## Purpose

Define a repeatable process when customer notifications fail, are delayed, or are sent with incorrect outcomes.

## Triggers

- Increased failures in booking confirmation/reminder sends.
- Cron jobs (`send-reminders`, `marketing-automation`) returning non-2xx.
- Provider incident affecting Resend/Twilio.

## Severity guide

- **SEV1:** Confirmations broadly failing for active bookings.
- **SEV2:** Reminder failures/delays with partial impact.
- **SEV3:** Low-volume failures or retries that eventually succeed.

## Immediate triage (first response)

1. Confirm incident scope:
   - confirmation emails
   - reminder emails
   - SMS reminders/alerts
2. Check cron and API route health for:
   - `app/api/cron/send-reminders`
   - `app/api/cron/marketing-automation`
   - booking confirmation send paths
3. Verify secrets/config (without exposing values):
   - `CRON_SECRET`
   - provider API key presence in runtime env
4. Check provider status pages and known incidents.

## Diagnostics checklist

- [ ] Notification failures are limited to one channel or global.
- [ ] No auth/permission issues blocking cron route invocation.
- [ ] No deployment regression in email/SMS libraries.
- [ ] Retry behavior exists and is not causing duplicate spam.
- [ ] User communication preference filters are still applied correctly.

## Mitigation options

- Temporarily disable non-critical campaigns; prioritize confirmations/reminders.
- Run controlled backfill for missed reminders where safe.
- Use alternate communication channel if one provider is down.
- Post a support notice if customer-facing impact is active.

## Recovery verification

- [ ] New confirmations send successfully for test + live-like bookings.
- [ ] Reminder cron routes return healthy responses.
- [ ] No duplicate bursts after retries/backfills.
- [ ] Incident timeline and corrective actions documented.

## Security and privacy

- Never post full customer contact data in incident channels.
- Redact API responses and provider payloads before sharing.
- Do not reveal provider keys or webhook secrets in logs/docs.

## Follow-up actions

- Add alerting thresholds for notification failures.
- Improve idempotency and dedupe logic if duplicates occurred.
- Update [../TESTING_STRATEGY.md](../TESTING_STRATEGY.md) with new regression cases.
- Update [../../PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](../../PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md) if new operational checks are required.

