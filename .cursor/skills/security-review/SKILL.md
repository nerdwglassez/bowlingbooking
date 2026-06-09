---
name: security-review
description: >-
  Readonly security review for PRs and agent output. Runs drift + audit,
  reviews git diff against .claude/contracts/SECURITY.md, and emits a PASS/FAIL
  report. Use when the user runs /security-review, before merging auth/payment/API
  changes, or after vibe-coding a sensitive feature.
---

# Security review workflow

Readonly workflow — **do not modify source** unless the user explicitly asks to fix findings.

## 1. Automated gates (run first)

```bash
npm run drift
npm run audit
```

If either fails, report failures verbatim and mark the review **BLOCKED** until fixed.

Optional (when tests exist for touched areas):

```bash
npm test -- <relevant test files>
```

## 2. Establish diff scope

```bash
git fetch origin
git diff origin/main...HEAD --name-only
git diff origin/main...HEAD
```

If not on a branch, use `git diff HEAD~1` or staged: `git diff --cached`.

## 3. Read contracts (in order)

1. `.claude/contracts/SECURITY.md` — this workflow's checklist
2. `.claude/contracts/AUTH.md` — session, roles, sign-in
3. `.claude/contracts/OPS.md` — rate limits, edge security
4. Surface-specific contract if applicable (`PAYMENTS.md`, `STAFF.md`, `ADMIN.md`)

## 4. Review checklist

For **each changed file** in the diff, evaluate:

### Critical (FAIL if any unchecked violation)

| Check | Look for |
|-------|----------|
| Auth bypass | New `'use server'` mutation without `requireRole` / `requireUser` where needed |
| IDOR | `bookingId`, `userId`, `tenantId` from client used without server re-fetch + scope check |
| Secret leak | API keys, `AUTH_SECRET`, `DATABASE_URL`, webhook secrets in diff or client bundles |
| Chokepoint break | Direct `next-auth`, `bcryptjs`, `stripe`, `resend`, `@/lib/prisma` outside allowed files |
| XSS | `dangerouslySetInnerHTML`, unescaped user HTML in email or pages |
| Payment integrity | Client-only booking confirm; webhook without signature verify |
| Refund policy | STAFF-role refund; missing audit log on financial mutation |

### Warning (report, may still PASS with notes)

| Check | Look for |
|-------|----------|
| Missing rate limit | New public server action without `assertRateLimit` / documented edge limit |
| Weak validation | Unbounded strings, missing email format check on public forms |
| Logging | `console.log` of emails, tokens, payment payloads |
| Error oracle | Different error messages revealing user existence (acceptable if already documented) |

## 5. Report format

Write a concise report (chat or `docs/tmp/security-review-YYYY-MM-DD.md` if user wants a file):

```markdown
# Security review — <branch or scope>

## Automated
- drift: PASS | FAIL
- audit: PASS | FAIL

## Verdict: PASS | PASS WITH WARNINGS | BLOCKED

## Critical findings
- (none) | file:line — issue — fix

## Warnings
- ...

## Checklist snapshot
- [x] Layout auth chokepoints unchanged / N/A
- [x] No secrets in diff
- ...

## Files reviewed
- path/to/file.ts — clean | finding
```

## 6. Definition of done

- [ ] `npm run drift` and `npm run audit` executed (not assumed)
- [ ] Every changed server action / API route in diff explicitly reviewed
- [ ] Verdict is justified; critical items have file references
- [ ] No secrets pasted into the report

## 7. After BLOCKED

List minimal fixes in priority order. Do not implement unless user switches to Agent mode and asks.

## Reference

Architecture sentinel: `.cursor/AGENTS.md` § Drift sentinel. Security greps live in `scripts/drift-check.mjs`.
