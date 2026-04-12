# Notifications and cron contracts

- **Class:** Canonical
- **Owner:** Platform backend + DevOps
- **Last reviewed:** 2026-04-12
- **Update trigger:** Changes to reminder/marketing jobs, notification channels, provider integration, or cron authorization

## Purpose

Define how asynchronous customer communication and scheduled background jobs are wired and protected.

## Scope

- In scope: email/SMS notification dependencies, cron route contracts, secrets, execution boundaries.
- Out of scope: customer UI copy specifics, full deployment setup details.
- Linked docs: [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md), [../SECURITY.md](../SECURITY.md), [../DEPLOY_VERCEL.md](../DEPLOY_VERCEL.md).

## Components and routes

| Area | Location | Notes |
|------|----------|-------|
| Email provider abstraction | `lib/email.ts` | Transactional sends and helper wrappers |
| Reminder cron | `app/api/cron/send-reminders/route.ts` | Scheduled reminder dispatch |
| Marketing automation cron | `app/api/cron/marketing-automation/route.ts` | Segment-driven campaign sends |
| SMS provider integration | Twilio-related server modules/routes | Optional channel, controlled via env/config |

## Behavioral contract

- Notification sends are server-side only; no provider secret keys in client code.
- Cron routes must require a shared secret (`CRON_SECRET`) to prevent public execution.
- Reminder and automation jobs should be safe to re-run (idempotent enough to avoid duplicate user impact).
- Provider outages should fail gracefully and preserve visibility for retry.

## Failure modes and response expectations

- Missing provider keys:
  - Trigger: required email/SMS env value not configured.
  - Behavior: channel send is skipped or fails safely with server logging.
  - Outcome: app remains available; communication is degraded.
- Invalid cron secret:
  - Trigger: missing or incorrect secret in request.
  - Behavior: cron route rejects call.
  - Outcome: unauthorized parties cannot execute jobs.
- Provider timeout/error:
  - Trigger: third-party API failure.
  - Behavior: per-message send fails; job records failure summary.
  - Outcome: operation team can retry and investigate.

## Security and privacy notes

- Never include raw API keys, phone numbers, or full personal data in committed docs.
- Keep recipient data minimal in logs; prefer IDs over full profile details.
- Protect cron endpoints with secret verification and avoid exposing open trigger URLs.

## Observability and operations

- Monitor:
  - reminder job run count/success/failures,
  - marketing automation run count/success/failures,
  - provider error classes and throttling responses.
- Keep operational notes in [../PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](../PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md).

## Testing and validation

- Validate cron authorization with and without correct secret.
- Validate at least one reminder path and one marketing automation path in non-production environment.
- Validate safe behavior when provider keys are missing.

## Change log

- 2026-04-12: Added canonical notification and cron service contract.
