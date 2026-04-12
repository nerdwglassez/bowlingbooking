# Operations and iteration docs

## Purpose

Provide long-term operational guidance for testing, incident handling, architecture decisions, and documentation health.

## Contents

| Document | Purpose |
|----------|---------|
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Domain-based testing strategy across customer, employee, services, and integrations |
| [../governance/DOC_HEALTH_REVIEW.md](../governance/DOC_HEALTH_REVIEW.md) | Recurring process for detecting stale docs and broken references |
| [runbooks/BOOKING_FAILURE_RUNBOOK.md](runbooks/BOOKING_FAILURE_RUNBOOK.md) | Incident response playbook for reservation failures |
| [runbooks/PAYMENT_MISMATCH_RUNBOOK.md](runbooks/PAYMENT_MISMATCH_RUNBOOK.md) | Incident response for payment/booking state mismatch |
| [runbooks/NOTIFICATION_OUTAGE_RUNBOOK.md](runbooks/NOTIFICATION_OUTAGE_RUNBOOK.md) | Incident response for reminder/campaign and automation failures |
| [adr/README.md](adr/README.md) | Architecture decision record process and template |

## Usage

- Keep these docs aligned with behavior and infrastructure changes.
- Update runbooks in the same PR as operational changes that affect incident response.
- Use placeholder-only values in command examples and payloads.
