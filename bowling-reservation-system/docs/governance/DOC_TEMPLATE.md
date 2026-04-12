# Documentation template

Use this template for new canonical docs and major updates.

```md
# <Title>

## Purpose
- What this doc covers.
- Why it exists.

## Scope
- In scope:
- Out of scope:
- Linked docs:

## Routes / APIs / Components (or equivalent)
| Area | Location | Notes |
|------|----------|-------|
| Example | `app/...` or `app/api/...` | Key constraints / behavior |

## Behavioral contract
- Expected behavior:
- Role or permission rules:
- State transitions:

## Edge cases and failure modes
- Failure mode:
  - Trigger:
  - System behavior:
  - User-visible outcome:

## Security and privacy notes
- Sensitive data handling:
- Auth/authorization dependencies:
- Secrets and environment assumptions:

## Observability and operations
- Logs/metrics to watch:
- Operational runbook links:

## Testing and validation
- Manual checks:
- Automated coverage:
- Release verification notes:

## Change log
- YYYY-MM-DD: brief change summary

## When you change behavior
- Which docs must be updated in the same PR.
- Which owners/reviewers should be requested.
```

## Authoring standards

- Prefer links to source files over copied code blocks.
- Avoid credentials or real account identifiers in examples.
- Keep examples minimal and synthetic.
- Keep language explicit and implementation-accurate.
