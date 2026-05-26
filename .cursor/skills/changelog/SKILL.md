---
name: changelog
description: >-
  Updates CHANGELOG.md from git history using Keep a Changelog format. Use when
  the user runs /changelog, asks to update the changelog, cut a release notes
  section, or refresh [Unreleased] from main.
---

# Changelog workflow

Run this workflow when the user invokes **`/changelog`** or asks to update `CHANGELOG.md`.

## Defaults

- **Scope:** `origin/main` (run `git fetch origin` first).
- **Mode:** Update **`[Unreleased]`** only — do not cut a version or bump `package.json` unless the user explicitly asks to release.
- **Commit:** Single commit touching only `CHANGELOG.md` (and `package.json` if releasing): `docs: update CHANGELOG`.

## Baseline

```bash
git fetch origin
git tag -l 'v*' --sort=-v:refname
```

| Situation | Compare |
|-----------|---------|
| Latest tag `vX.Y.Z` exists | `vX.Y.Z..origin/main` |
| No tags | Last `## [x.y.z]` section in `CHANGELOG.md` → use its date/commit as baseline, or full history if creating the file |
| New file | Seed `[0.1.0]` from first commit; put subsequent work in `[Unreleased]` or `[0.2.0]` per existing sections |

## Collect changes

```bash
git log <baseline>..origin/main --no-merges --format='%h|%ad|%s' --date=short
git diff <baseline>..origin/main --stat
git diff <baseline>..origin/main -- .env.example prisma/migrations/ docs/RUNBOOK.md .claude/contracts/
```

Cluster commits into **one bullet per feature**, not one per commit.

## Sections (Keep a Changelog)

Use only sections that have bullets: **Added**, **Changed**, **Fixed**, **Security**, **Removed**.

| Signal | Section |
|--------|---------|
| New routes, env vars, screens | Added |
| Behavior change, hardening | Changed |
| Bug fix | Fixed |
| Auth, codes, webhooks, limits | Security |
| Deprecated / removed API | Removed |

## Writing rules

- Audience: operators, deployers, and developers — not commit SHAs in bullets.
- Env changes: name the variable; point to `.env.example` and `docs/RUNBOOK.md`.
- Every bullet must trace to a commit or diff; do not invent features.
- Never paste secrets from `.env.local` or real credentials.

**Good:** Walk-in bookings retry with a new confirmation code if the generated code collides with an existing booking.

**Bad:** Update `staff.ts`.

## Release cut (only when user asks)

1. Move `[Unreleased]` bullets to `## [X.Y.Z] - YYYY-MM-DD`.
2. Clear `[Unreleased]` subsection bullets (keep headers).
3. Optionally `git tag vX.Y.Z` and bump `package.json` `version`.
4. Add compare links at the bottom of `CHANGELOG.md`.

## Definition of done

- [ ] `CHANGELOG.md` at repo root follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- [ ] `[Unreleased]` reflects `origin/main` since the last documented version.
- [ ] Bullets are de-duplicated and user-facing.
- [ ] Committed with `docs: update CHANGELOG` (unless user said not to commit).

## Reference

Full agent plan and examples: see repo history or ask the user for the changelog maintenance plan document.
