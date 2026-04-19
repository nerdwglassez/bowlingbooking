# Documentation ownership model

Use this ownership map so documentation stays current as reservation, employee, and platform features evolve.

## Owner roles

- **Primary owner:** Responsible for correctness and updates.
- **Secondary owner:** Backup reviewer; ensures continuity.
- **Security reviewer:** Required when auth, payments, secrets, or data handling changes.

> Owners are roles/teams, not individual names, to avoid churn when staffing changes.

## Ownership map

| Domain | Primary owner | Secondary owner | Security reviewer required? | Canonical docs |
|--------|----------------|------------------|-----------------------------|----------------|
| Customer reservation flow | Product + Frontend | Platform backend | When auth/payment/data paths change | `docs/RESERVATION_FLOW.md` |
| Staff/manager/admin employee experience | Product + Ops tools | Platform backend | When role checks or internal APIs change | `docs/STAFF_AND_ADMIN_EXPERIENCE.md` |
| Shared platform services | Platform backend | Product + Frontend | Yes | `docs/SHARED_PLATFORM.md` |
| Security and operational hardening | Platform backend | DevOps | Yes (always) | `docs/SECURITY.md`, `docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md` |
| Environment, setup, deployment | DevOps | Platform backend | Yes if secrets/env handling changes | `SETUP.md`, `docs/LOCAL_VS_LIVE.md`, `docs/DEPLOY_VERCEL.md` |
| Product scope tracking | Product owner | Engineering lead | Optional unless security-impacting | `PRD_GAP_ANALYSIS.md`, `IMPLEMENTATION_PHASES.md`, `docs/PRD_UPDATE_PLAN.md` |
| Documentation governance process | Engineering lead | Product owner | Yes for checklist updates | `docs/governance/*` |

## Review triggers

Open a docs update in the same PR when any of these happen:

1. Route or API behavior changes.
2. Employee role/permission behavior changes.
3. Shared pricing/availability/payment logic changes.
4. New env var, secret, cron, or integration key is introduced.
5. Component contract changes (props/state transitions) in shared or core flow components.

## PR review expectations

- **Author** updates relevant docs in the same branch.
- **Primary owner reviewer** validates behavior and terminology.
- **Security reviewer** checks secret handling and access control docs when triggered.
- **Merge gate:** No merge when behavior changed but canonical docs are stale.
