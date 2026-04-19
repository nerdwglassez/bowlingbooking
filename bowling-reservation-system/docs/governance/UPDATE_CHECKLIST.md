# Documentation update checklist

Use this checklist on every pull request that changes behavior, APIs, routes, permissions,
data contracts, operational setup, or user-facing flow text.

## 1) Identify what changed

- [ ] Customer journey changed (booking, confirmation, bookings list/detail, profile, waitlist)
- [ ] Employee journey changed (staff, manager, admin, kiosk)
- [ ] Shared services changed (auth/session, availability, pricing, discounting, payments, notifications)
- [ ] Component behavior or reusable UI contract changed
- [ ] Operational behavior changed (deployment, cron, security controls, environment variables)

## 2) Update required docs by domain

- [ ] `docs/RESERVATION_FLOW.md` for customer-facing behavior changes
- [ ] `docs/STAFF_AND_ADMIN_EXPERIENCE.md` for internal behavior changes
- [ ] `docs/SHARED_PLATFORM.md` for shared concepts/contracts
- [ ] `PRD_GAP_ANALYSIS.md` for implementation status changes
- [ ] Setup/deploy/security/performance docs when operational behavior changes
- [ ] Add or update component docs once component layer docs are introduced

## 3) Keep structure and quality consistent

- [ ] Scope section clearly says what is in/out
- [ ] Route/API references are accurate and linked
- [ ] Role/access statements match server-side auth requirements
- [ ] Edge cases/failure states are documented where behavior changed
- [ ] "When you change behavior" guidance is still accurate

## 4) Safe Git upload and secret hygiene (required)

Before `git add`:

- [ ] Confirm no real secrets were added to Markdown, code, examples, or scripts
- [ ] Use placeholders only (`example`, `REDACTED`, `...`) for keys/tokens/passwords
- [ ] Ensure `.env.local`, `.env`, and generated secret files remain ignored
- [ ] Avoid credential-bearing database URLs in committed docs (never real username/password/host)

Recommended scan command (run from repo root):

```bash
rg -n "(sk_live_|pk_live_|whsec_|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----|xox[baprs]-|ghp_[A-Za-z0-9]{30,})" .
```

If scan hits are found:

- [ ] Verify each match is only a placeholder/example
- [ ] Replace any real value with `REDACTED` immediately
- [ ] Re-scan before commit

## 5) Pre-merge verification

- [ ] `docs/README.md` includes links to any new canonical docs
- [ ] Cross-links between flow and shared docs still work
- [ ] New docs use the standard template (or intentionally justify deviation)
- [ ] PR summary explicitly lists which docs were updated and why
