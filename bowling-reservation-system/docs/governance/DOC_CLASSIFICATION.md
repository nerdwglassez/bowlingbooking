# Documentation classification

Use these classes to decide where a doc belongs and how strictly it is maintained.

## 1) Canonical

Canonical docs define current product behavior and engineering truth.

Examples in this repo:
- `docs/RESERVATION_FLOW.md`
- `docs/STAFF_AND_ADMIN_EXPERIENCE.md`
- `docs/SHARED_PLATFORM.md`

Rules:
- Must be updated in the same PR as behavior changes.
- Must include routes/APIs/components that are currently active.
- Must avoid TODO-heavy or speculative language.

## 2) Operational

Operational docs explain setup, deployment, security, and runbooks.

Examples:
- `SETUP.md`
- `docs/DEPLOY_VERCEL.md`
- `docs/SECURITY.md`
- `docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md`

Rules:
- Must prioritize safe execution and environment handling.
- Must avoid real credentials or private endpoints.
- Should include validation/check commands for confidence.

## 3) Historical

Historical docs preserve useful context from prior implementations, audits, or design pulls.

Examples:
- `docs/STAFF_BOOKING_AND_CSS_AUDIT.md`
- `docs/FIGMA_STEP1_EVENT_TYPE_SELECTED.md`

Rules:
- Clearly label as historical context.
- Do not present old behavior as current truth.
- Link to canonical docs for the latest implementation.

## 4) Archive

Archive docs are retained for reference but are not maintained.

Rules:
- Move only when the content is no longer used for active implementation decisions.
- Add a short "Archived on YYYY-MM-DD" note when archived.
- Keep archives read-only except for metadata corrections.

## Required metadata block (new docs)

New docs should include this short metadata section near the top:

- **Class:** Canonical | Operational | Historical | Archive
- **Owner:** Team or role (see `DOC_OWNERS.md`)
- **Last reviewed:** YYYY-MM-DD
- **Update trigger:** What types of changes require updates
