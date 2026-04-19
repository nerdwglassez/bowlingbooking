# Service contracts index

This section defines service-level contracts that support both customer and employee flows.

| Service contract | Purpose |
|------------------|---------|
| [AUTH_AND_ROLES.md](AUTH_AND_ROLES.md) | Session model, role enforcement, auth API boundaries |
| [AVAILABILITY_AND_SCHEDULING.md](AVAILABILITY_AND_SCHEDULING.md) | Slot generation, lane constraints, scheduling invariants |
| [PRICING_DISCOUNTS_LOYALTY.md](PRICING_DISCOUNTS_LOYALTY.md) | Total calculation, code application, loyalty redemption rules |
| [PAYMENTS_AND_WEBHOOKS.md](PAYMENTS_AND_WEBHOOKS.md) | Stripe intent/confirm lifecycle and webhook handling requirements |
| [NOTIFICATIONS_AND_CRON.md](NOTIFICATIONS_AND_CRON.md) | Email/SMS triggers, cron contracts, secret-gated automation |
| [PARTNER_API_AND_POS.md](PARTNER_API_AND_POS.md) | Partner API boundaries and POS integration expectations |

## Usage

- Update these docs in the same PR when service contracts change.
- Keep flow docs focused on user journeys and reference these for shared backend rules.
- Use placeholder-only examples; do not include real keys, tokens, account IDs, or credentialed URLs.
