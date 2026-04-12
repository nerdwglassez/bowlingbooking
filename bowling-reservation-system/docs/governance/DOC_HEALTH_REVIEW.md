# Documentation health review process

Run this review on a fixed cadence (recommended: monthly for active projects, quarterly minimum).

## Purpose

Detect stale docs, broken links, missing ownership, and security hygiene drift before they create implementation risk.

## Review cadence and ownership

- **Primary coordinator:** engineering lead or documentation owner.
- **Participants:** product + platform/backend + operations reviewers.
- **Minimum cadence:** quarterly.
- **Recommended cadence:** monthly during active feature delivery.

## Checklist

### 1) Ownership and metadata

- [ ] Every canonical doc has a clear owner role in [DOC_OWNERS.md](DOC_OWNERS.md).
- [ ] New docs include class/owner/review metadata where required.
- [ ] Historical docs are clearly marked and not presented as current behavior.

### 2) Link and structure integrity

- [ ] `docs/README.md` lists all current canonical/governance/service/component/operations indexes.
- [ ] New subfolder indexes (`services`, `components`, `operations`, `governance`) link to valid files.
- [ ] No orphan docs (files not referenced anywhere relevant).

### 3) Behavior alignment

- [ ] Customer flow docs align with current routes and APIs.
- [ ] Staff/admin docs align with internal route and role gates.
- [ ] Service contract docs match current implementation boundaries.
- [ ] Component docs reflect active contracts (not outdated props/states).

### 4) Security and secret hygiene

- [ ] No real credentials/tokens/keys in docs.
- [ ] Placeholder-only examples remain enforced.
- [ ] Secret scan command in [UPDATE_CHECKLIST.md](UPDATE_CHECKLIST.md) is still fit for current integrations.

### 5) Operational readiness

- [ ] Testing strategy reflects current critical journeys.
- [ ] Runbooks exist for top incidents and link to current APIs/routes.
- [ ] ADR index/template are discoverable and being used for major decisions.

## Output of each health review

Produce a short update note in the tracking system (or PR/issue) with:

1. Issues found (with severity).
2. Required updates and owners.
3. Target docs impacted.
4. Follow-up review date.

## Escalation rule

If a production-impacting behavior changed and canonical docs are stale, treat as a release blocker until docs are corrected.
