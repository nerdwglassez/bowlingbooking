# ADR template

Use this template for architecture decisions that affect long-term behavior, security posture, or operational cost.

```md
# ADR-<YYYYMMDD>-<short-title>

## Status
- Proposed | Accepted | Superseded | Deprecated

## Context
- What problem are we solving?
- What constraints matter (security, scale, compatibility, compliance)?

## Decision
- What did we choose?
- Why this option over alternatives?

## Consequences
- Positive effects:
- Negative effects / tradeoffs:
- Security/privacy implications:

## Implementation notes
- Affected routes/APIs/components:
- Migration plan:
- Rollback plan:

## Follow-up
- Review date:
- Owner:
- Related docs/PRs:
```

## Naming convention

- File format: `ADR-YYYYMMDD-short-title.md`
- Keep titles implementation-specific (e.g., `ADR-20260412-use-shared-rate-limiter-contract.md`)

## Security note

ADRs must not include secrets, account identifiers, private hostnames, or credential-bearing URLs.
