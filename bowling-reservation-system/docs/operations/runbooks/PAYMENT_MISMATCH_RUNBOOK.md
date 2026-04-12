# Payment mismatch runbook

## Purpose

Handle incidents where payment status and booking status diverge (for example, payment captured but booking not confirmed, or booking marked paid without confirmed payment event).

## Trigger symptoms

- Customer reports successful card charge but no valid booking confirmation.
- Staff sees booking status not aligned with payment records.
- Spike in payment confirm API failures.

## Severity guide

- **SEV-1:** Multiple customers impacted, active revenue loss, or broad checkout outage.
- **SEV-2:** Isolated customers affected with manual remediation possible.
- **SEV-3:** Cosmetic/reporting mismatch without customer impact.

## Immediate actions

1. Acknowledge incident in team channel and assign incident lead.
2. Disable risky retries if they could duplicate charges.
3. Capture representative booking IDs and timestamps.

## Investigation checklist

- Validate Stripe intent/payment status against internal booking status.
- Check confirm-payment route responses for validation/auth failures.
- Verify webhook delivery status and signature verification path (if webhook flow is active).
- Confirm idempotency assumptions in payment confirm handling.

## Containment

- Pause affected checkout path only if duplicate-charge risk exists.
- Add clear user messaging to avoid repeated payment attempts during incident.
- Route impacted customers to manual support path.

## Remediation

- Reconcile each impacted booking record with the corresponding payment event.
- Mark booking status consistently after payment verification.
- Issue refunds/retries only after confirming duplicate or failed capture state.
- Document each manual correction with operator + timestamp.

## Recovery validation

- New checkout attempts complete successfully end-to-end.
- Payment and booking statuses remain consistent for sampled transactions.
- No growth in mismatch metrics for at least one monitoring window.

## Post-incident actions

- Add/adjust alerts on payment-confirm failure rates and mismatch detections.
- Record root cause and preventions in ADR if architectural change is needed.
- Update [../TESTING_STRATEGY.md](../TESTING_STRATEGY.md) with any new regression tests.
