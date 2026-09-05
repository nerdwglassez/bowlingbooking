# Royal Z Lanes — Multi-Agent Build Plan

This document defines the agent topology, scopes, contracts, and execution order for building the Royal Z Lanes booking system without architectural drift.

The system is designed around the project's existing anti-drift architecture:

- 4-layer component hierarchy (tokens → primitives → patterns → pages)
- Single source-of-truth helpers (`getLaneCount`, `calculatePrice`, `getTenant`)
- Token-only color system, server-side-only mutations
- Figma-driven visual spec + Untitled UI React Layer 2
- Staff `data-theme="dark"` uses stock Untitled brand (purple); customer light stays amber until `/book` is redesigned. Do not remap employee brand to amber.

Each agent owns exactly one directory tree and reads from a frozen interface above it. Drift is impossible as long as the orchestrator releases each agent only after the contracts below are frozen.

---

## 1. Agent topology

```
                     ┌────────────────────────────┐
                     │  Orchestrator (human / AI) │
                     │  - decides phase + order   │
                     │  - reads completion reports│
                     └─────────────┬──────────────┘
                                   │
   ┌───────────────┬───────────────┼───────────────┬────────────────┐
   ▼               ▼               ▼               ▼                ▼
 INFRA          TOKENS          DOMAIN          FIGMA-SPEC        DRIFT
 (config)       (theme.css)     (lib/api/db)    (Figma→spec)      SENTINEL
   │               │               │                                 ▲
   │               ▼               │                                 │
   │           PRIMITIVES          │                                 │
   │           (base/application)  │                                 │
   │               │               │                                 │
   │               ▼               │                                 │
   │           PATTERNS            │                                 │
   │           (patterns/)         │                                 │
   │               │               │                                 │
   │               ▼               ▼                                 │
   │       ┌───────┴────────┬────────────┐                           │
   │       ▼                ▼            ▼                           │
   │   CUSTOMER          STAFF         ADMIN                         │
   │   (app/(customer))  (app/(staff)) (app/(admin))                 │
   │       │                │            │                           │
   └───────┴────────────────┴────────────┴───────────────────────────┘
```

---

## 2. Agent roster

Each agent owns exactly one directory tree (write access) and reads from the layer above (read-only). Anything outside that scope is forbidden and the orchestrator should reject the agent's output if it touches files outside its lane.

| # | Agent | Owns (writes) | Reads (consumes) | Forbidden |
|---|---|---|---|---|
| 1 | **Infra** | Root configs: `tailwind.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `package.json`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, route-group `layout.tsx` files | `.claude/`, `node_modules/next/dist/docs/`, `AGENTS.md` | Touching components, libs, or pages content |
| 2 | **Tokens** | `src/styles/theme.css`, `src/styles/tokens.css`, `src/styles/themes/*.css` | `.claude/DESIGN_SYSTEM.md`, FIGMA.md | Adding tokens not in spec; using palette vars in components |
| 3 | **Primitives** | `src/components/base/*`, `application/*`, `foundations/*`; `ui/` re-exports only | theme.css, FIGMA.md, UNTITLED.md, PRIMITIVES.md | Raw hex, raw palette utilities, business logic, inventing non-Untitled primitives, skipping Untitled MCP CLI |
| 4 | **Patterns** | `src/components/patterns/*` | `base/` / `application/`, Figma, UNTITLED.md, PRIMITIVES.md | Importing palette tokens, importing DB, resurrecting Slot primitives |
| 5 | **Domain / Backend** | `src/lib/*`, `prisma/`, `src/app/api/**`, `src/types/index.ts` | `.claude/BOOKING_DOMAIN.md`, schema | Importing React, touching components |
| 6 | **Customer pages** | `src/app/(customer)/**`, `src/context/BookingContext.tsx` | patterns/, base/, lib/, types/, Figma | New styles at page level, importing prisma directly |
| 7 | **Staff pages** | `src/app/(staff)/**`, `src/components/chrome/**` | patterns/, base/, application/, lib/, Figma | Same as #6; refund mutations must go through API only |
| 8 | **Admin pages** | `src/app/(admin)/**` | patterns/, chrome (shared), base/, lib/, Figma | Same as #6; do not duplicate AppShell |
| 9 | **Figma-to-spec** (readonly) | `.claude/specs/**` | Figma frames via MCP / FIGMA.md | All other writes; do not treat docs/wireframes as SoT |
| 10 | **Drift sentinel** (readonly) | `drift-report.json` | everything | Any source-code write |
| 11 | **Security review** (readonly) | review report only | diff + `.claude/contracts/SECURITY.md` | Any source-code write |

---

## 3. The four contracts that prevent drift

These artifacts are produced by upstream agents and consumed by downstream agents. Once frozen, downstream agents may not write to them. Any new entry requires going back upstream.

### 3.1 Token contract — `.claude/contracts/TOKENS.md`
Exhaustive enumerated list of allowed semantic token names (`--surface-*`, `--color-*`, `--status-*`, `--font-*`, `--radius-*`, `--shadow-*`). Palette tokens (`--palette-*`) appear here only in the "forbidden in components" section. **Owner: Tokens agent. Consumers: Primitives, Patterns.**

### 3.2 Primitive contract — `.claude/contracts/PRIMITIVES.md`
Per-component TypeScript prop signature + variant enum, copied verbatim from `.claude/DESIGN_SYSTEM.md`. Patterns and pages import variant unions from here. **Owner: Primitives agent. Consumers: Patterns, all page agents.**

### 3.3 Type contract — `src/types/index.ts`
Already exists. Frozen after Phase 3. Any agent that needs a new type files a request to Domain — only Domain may merge changes.

### 3.4 API contract — `.claude/contracts/API.md`
Request/response shapes for every route in `.claude/BOOKING_DOMAIN.md` § "API routes structure". **Owner: Domain agent. Consumers: all page agents.**

---

## 4. Mapping to Cursor `Task` subagent types

| Agent role | Cursor `subagent_type` | Notes |
|---|---|---|
| Figma-to-spec | `explore` (readonly) | Pure recon from Figma MCP — not HTML wireframes |
| Drift sentinel | `explore` (readonly) | Greps for banned patterns |
| Security review | `explore` (readonly) | Diff review + `npm run drift` + `npm run audit`; see `.cursor/skills/security-review/SKILL.md` |
| Infra | `generalPurpose` | Multi-step config edits |
| Tokens | `generalPurpose` | Small, focused scope |
| Primitives | `generalPurpose`; **must** use Untitled MCP `get_component` / CLI — never best-of-n Radix/CVA |  |
| Patterns | `generalPurpose` | Composition only |
| Domain / Backend | `generalPurpose` + `shell` for `prisma generate`, `npm install` | Largely mechanical from schema + docs |
| Page groups | `generalPurpose`, one per route group | Parallelizable once contracts are frozen |
| DB setup / installs | `shell` | Stateful terminal ops |
| CI / PR failures | `ci-investigator` | When checks fail |
| Cursor product Qs | `cursor-guide` | If anyone asks about hooks / skills |

---

## 5. Phase-by-phase execution

### Phase 0 — Stack baseline (1 agent, sequential)

- **Infra agent** decides Tailwind v3 vs v4, Next 14 vs 16, NextAuth v4 vs v5, money representation, single- vs multi-tenant launch posture.
- Patches `package.json`, `tailwind.config.ts`, `eslint.config.mjs`, `tsconfig.json` to be internally consistent.
- Updates `.claude/PROJECT_OVERVIEW.md` to reflect the installed versions.
- **Output:** `.claude/STACK_BASELINE.md` — one page, every downstream agent reads it first.

### Phase 1 — Foundation (3 agents, mostly parallel)

Parallel batch:
- **Tokens agent** verifies `tokens.css` against `DESIGN_SYSTEM.md` and emits `.claude/contracts/TOKENS.md`.
- **Infra agent (pass 2)** rewrites `src/app/globals.css`, `src/app/layout.tsx`, replaces the demo `page.tsx`, scaffolds empty `(customer)/(staff)/(admin)/api` route-group layouts with correct `data-theme`.
- **Figma-to-spec agent** (readonly `explore`) reads Figma frames via MCP and emits `.claude/specs/{group}/{screen}.md` summaries. Do not treat `docs/wireframes/` as visual SoT.

**Gate:** drift sentinel runs once before unlocking Phase 2.

### Phase 2 — Primitives (Untitled CLI)

Once `theme.css` / tokens are frozen:

- Primitives agent installs Untitled components via MCP `get_component_bundle` into `src/components/base/`, `application/`, `foundations/`.
- `src/components/ui/` stays **re-exports only** for unreworked call sites.
- Do **not** run best-of-n CVA vs Radix Slot for Button. Untitled CLI is the strategy (`STACK_BASELINE.md` § 6). Load `.cursor/skills/untitled-figma/SKILL.md`.

**Gate:** drift sentinel + `npm run lint`. **Output:** `.claude/contracts/PRIMITIVES.md` + UNTITLED.md.

### Phase 3 — Backend foundation (1 agent, parallel with Phase 2)

- **Domain agent** with a `shell` subagent for `prisma generate`.
  - Creates `lib/prisma.ts`, `lib/tenant.ts`, `lib/auth.ts`, `lib/stripe.ts`, `lib/email.ts`.
  - Writes `prisma/seed.ts`.
  - Patches `pricing.ts` for the `Decimal` boundary issue.
  - Implements API routes per `BOOKING_DOMAIN.md`.
  - **Output:** `.claude/contracts/API.md`.

Touches no overlapping files with Phase 2.

### Phase 4 — Patterns (1 agent, after Phase 2)

- **Patterns agent** builds: `BookingStepShell`, `FeaturedBookingCard`, `StaffCockpitHeader`, `LaneTimelineRow`, `PackageCard`, `PriceFooter`.
- Composes only from Untitled `base/` / `application/` (or `ui/` shims). May import types from PRIMITIVES.md. No raw palette utilities.

**Gate:** drift sentinel.

### Phase 5 — Pages (3 agents, fully parallel, after Phase 3 + 4)

- **Customer pages agent** — booking flow + dashboard + cancel/reschedule.
- **Staff pages agent** — cockpit + walk-in + schedule + reports; may write `src/components/chrome/**`.
- **Admin pages agent** — settings screens; shares AppShell chrome (do not duplicate).

Never touch each other's route groups. Never invent primitives — file a request or install via Untitled MCP. If a page agent needs a new Untitled component, halt and install via CLI rather than styling inline.

### Phase 6 — Hardening

- **Drift sentinel** full sweep.
- **QA agent** adds Playwright e2e, Stripe webhook tests, expired-hold cron, second-tenant onboarding test.
- **`ci-investigator`** stands by for PR failures.

---

## 6. The drift sentinel — concrete checks

The sentinel is the single most important safety mechanism. It only reads, only greps, and only reports. Implementation is ~30 lines of `rg` + a JSON report.

**Banned in `src/components/**` and `src/app/**` (anywhere outside `tokens.css` / themes / `src/lib/theme.ts` comments):**
- `var\(--palette-` — palette token leak
- `#[0-9a-fA-F]{3,6}\b` — raw hex (skip CSS files)
- `\b(bg|text|border|ring|outline|placeholder|caret|accent|fill|stroke)-(amber|stone|red|green|blue|purple|zinc|slate|gray|neutral|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|pink|rose)-[0-9]+\b` — Tailwind color class
- `[\s"'\x60]dark:` — **allowed** for Untitled utilities when `@custom-variant dark` maps to `[data-theme="dark"]`. **Banned:** `@media (prefers-color-scheme: dark)`. The live sentinel is `scripts/drift-check.mjs`.
- `'Fraunces'|"Fraunces"|'DM Sans'|"DM Sans"` — hardcoded font string

**Banned in pages (`src/app/**/page.tsx`, non-root `layout.tsx`):**
- `style=\{` containing `color|background|border|font-`
- Any import from `@/lib/prisma` (pages must go through API routes or server actions in `lib/`)

**Banned in patterns (`src/components/patterns/**`):**
- Any token reference except via the imported primitive (no `var(--`)

**Required (FAIL if seen elsewhere):**
- `Math.ceil(.+\/\s*6)` must appear only inside `src/lib/lane-logic.ts`
- Refund mutation code must appear only under `src/app/api/staff/bookings/[id]/refund/route.ts`
- `getTenant(` must be the only way `Tenant` rows are loaded

**Run between every agent.** Block the next agent if any rule fails.

**Security greps** (also in drift sentinel — see `.claude/contracts/SECURITY.md`):
- `dangerouslySetInnerHTML`, `eval(`, `new Function(` — banned everywhere
- Secret `process.env` in `'use client'` files — only `NEXT_PUBLIC_*` / `NODE_ENV`
- `@/lib/prisma` / `@/generated/prisma/client` in app `page.tsx` / route `layout.tsx` — banned
- **`npm run audit`** — high/critical dependency CVEs fail CI

After sensitive changes (auth, payments, webhooks, new public actions), run **`/security-review`** (`.cursor/skills/security-review/SKILL.md`).

---

## 7. Orchestration patterns

Three options, from least to most automated:

1. **Human-orchestrated** — paste prompts one at a time, read each agent's report, run the sentinel between them. Best while the system is still being calibrated. Recommended for Phases 0–2.
2. **Parent agent orchestrates with `Task`** — one long-running Agent-mode chat spawns subagents via `Task(subagent_type=...)` in the order described. Best once contracts are stable. Recommended for Phases 3–6.
3. **CI orchestrates** — wrap each agent as a Cursor SDK call (`@cursor/sdk`) triggered by GitHub Actions, drift sentinel as a required check. Heaviest, most reproducible. Worth it only post-MVP.

---

## 8. Dependency / parallelism graph

```
Phase 0 ─ Infra(v1) ────────────────────────────────────────────►
                  │
                  ▼
Phase 1 ─ Infra(v2) ─┬─ Tokens ─┬─ Wireframe-spec ──► sentinel ──►
                     │          │
Phase 2 ─────────────┴──────────┴─► Untitled CLI primitives ──► sentinel ──►
                                                      │
Phase 3 (parallel with Phase 2) ─ Domain ─────────────┤
                                                      ▼
Phase 4 ──────────────────────► Patterns ────► sentinel ──►
                                  │
Phase 5 ──────────────────────────┴─► Customer ┐
                                      Staff    ├─ parallel ──► sentinel ──►
                                      Admin    ┘
                                                      │
Phase 6 ──────────────────────────────────────────────┴─► QA + hardening
```

Critical-path length: Phase 0 → Phase 1 → Primitives → Patterns → Pages. Phase 3 (Domain) parallels Phases 2 and 4 entirely — that's where most of the wall-clock speedup comes from.

---

## 9. Agent prompt templates

Each prompt is self-contained and references the contract files so the agent cannot drift.

### Infra agent (Phase 0 + 1)

> You are the Infra agent for the Royal Z Lanes project. Your scope is root config files only: `package.json`, `tailwind.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `next.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, and creating empty route group folders.
>
> Read in order: `.claude/PROJECT_OVERVIEW.md`, `.claude/CURSOR_RULES.md`, `.claude/DESIGN_SYSTEM.md`, `AGENTS.md`, then skim `node_modules/next/dist/docs/index.md` and `node_modules/next/dist/docs/01-app/`.
>
> Tasks:
> 1. Decide and document the stack version baseline (Next, React, Tailwind, Prisma) — pick one and update `.claude/PROJECT_OVERVIEW.md` so it matches `package.json`. Write a one-page `STACK_BASELINE.md` to `.claude/`.
> 2. Rewrite `src/app/globals.css` to: `@import 'tailwindcss'`, then import `src/styles/tokens.css` and `src/styles/themes/default.css`, then set base body styles using token variables only.
> 3. Rewrite `src/app/layout.tsx`: load Fraunces + DM Sans via `next/font/google`, bind them to `--font-display` and `--font-body` via CSS variables on `<html>`, inject `THEME_SCRIPT` from `src/lib/theme.ts` to prevent FOUC, leave `data-theme` unset (route groups set it).
> 4. Delete the demo content in `src/app/page.tsx`; replace with a minimal redirect to `/book` using token-only styles.
> 5. Create `src/app/(customer)/layout.tsx`, `src/app/(staff)/layout.tsx`, `src/app/(admin)/layout.tsx`. Set `<html data-theme="light">` on customer, `<html data-theme="dark">` on staff/admin. No other content.
> 6. Re-implement the "no Tailwind color utilities" guardrail in whichever Tailwind version was chosen.
>
> Do NOT touch anything under `src/components/`, `src/lib/`, `src/styles/tokens.css`, or `prisma/`.
>
> Return: list of files changed, version decisions made, and a checklist of what the Tokens / Primitives agents can now rely on.

### Tokens agent (Phase 1)

> You are the Tokens agent. Your only writable files are `src/styles/tokens.css` and `src/styles/themes/*.css`.
>
> Read `.claude/DESIGN_SYSTEM.md` § "Layer 1 — Design tokens" and `src/styles/tokens.css`. Verify the file matches the spec exactly. Move the Google Fonts `@import` out of `tokens.css` if the Infra agent moved font loading into `next/font/google`.
>
> Then produce `.claude/contracts/TOKENS.md` — a flat enumerated list of every allowed semantic token name. Palette tokens appear here ONLY in a "forbidden in components" section.
>
> Return: the `TOKENS.md` content and any drift found vs `DESIGN_SYSTEM.md`.

### Figma-to-spec agent (Phase 1, readonly)

> You are the Figma-to-spec agent (readonly). For each Figma frame listed in `.claude/contracts/FIGMA.md`, produce a markdown spec at `.claude/specs/{group}/{screen}.md` containing:
> - One-sentence summary
> - Section list (header, sidebar, list, footer, etc.)
> - Untitled component inventory (base/application names from MCP)
> - State variations shown (default, selected, error, loading, empty)
> - Any business rules baked into the design (e.g., "lane count displayed, never bowler/6 typed")
>
> Do NOT treat `docs/wireframes/` as visual SoT when a Figma frame exists. Do NOT touch source code.

### Primitive agent template (Phase 2)

> You are the Primitives agent. Writable: `src/components/base/`, `application/`, `foundations/`, and thin `ui/` re-exports.
>
> Read in order: `.claude/contracts/UNTITLED.md`, `.claude/contracts/PRIMITIVES.md`, `.claude/DESIGN_SYSTEM.md`, `.cursor/skills/untitled-figma/SKILL.md`.
>
> Install Untitled UI via MCP `get_component` / `get_component_bundle` then the returned CLI. Point `cx` at `@/lib/cx`. Do not hand-roll PRO components. Do not commit license keys. Do not invent Radix Slot buttons.
>
> Return: files installed, shim status, any components you wished existed but didn't (do NOT invent them — file a request).

### Domain agent (Phase 3)

> You are the Domain agent. Your writable scope is `src/lib/*`, `prisma/`, `src/app/api/**`, `src/types/index.ts`.
>
> Read `.claude/BOOKING_DOMAIN.md`, `prisma/schema.prisma`, `src/types/index.ts`, `src/lib/lane-logic.ts`, `src/lib/pricing.ts`, `src/lib/theme.ts`, `.claude/STACK_BASELINE.md`.
>
> Tasks:
> 1. Create `lib/prisma.ts` (singleton, Next 16 + dev hot-reload safe).
> 2. Create `lib/tenant.ts` with `getTenant(slug)`. Honor `DEFAULT_TENANT_SLUG` env if single-tenant mode is chosen in `STACK_BASELINE.md`.
> 3. Create `lib/auth.ts` per `STACK_BASELINE.md` decision (NextAuth v4 or v5). Export `requireRole('MANAGER')` helper.
> 4. Create `lib/stripe.ts` singleton.
> 5. Create `lib/email.ts` with `sendBookingConfirmation()` stub using Resend.
> 6. Patch `pricing.ts` to convert `Prisma.Decimal` → `number` at boundary, OR switch to `decimal.js` per `STACK_BASELINE.md`.
> 7. Write `prisma/seed.ts`: 1 Tenant ("Royal Z Lanes"), 8–12 Lanes, OperatingHours for each day, 3–4 Packages covering each PartyType.
> 8. Implement API routes per `BOOKING_DOMAIN.md` § "API routes structure".
> 9. Produce `.claude/contracts/API.md` with request/response shapes for every route.
>
> Do NOT import React. Do NOT touch components or pages.
>
> Return: file list, `API.md` summary, any open questions blocked on tenant config shape.

### Drift sentinel (any phase, readonly)

> You are the Drift Sentinel (readonly). Run these checks via `rg` and emit a JSON report:
>
> 1. In `src/components/**` and `src/app/**`, FAIL on any match of: `var\(--palette-`, `#[0-9a-fA-F]{3,6}\b`, `\b(bg|text|border|ring)-(amber|stone|red|green|blue|purple|zinc)-[0-9]+`, `@media (prefers-color-scheme: dark)`, `'Fraunces'|"Fraunces"|'DM Sans'|"DM Sans"`. Untitled `dark:` utilities are allowed when mapped to `[data-theme="dark"]`. Prefer running `npm run drift` (`scripts/drift-check.mjs`) over reimplementing greps.
> 2. In `src/app/**/page.tsx`, FAIL on any `style=\{` containing `color|background|border|font-`.
> 3. `Math.ceil` of `/6` must appear only in `src/lib/lane-logic.ts`. FAIL on any other match.
> 4. `prisma` import outside `src/lib/` and `src/app/api/**` is a FAIL.
> 5. Refund mutation outside `src/app/api/staff/bookings/[id]/refund/route.ts` is a FAIL.
>
> Output: `drift-report.json` with `{ file, line, rule, snippet }` per failure. Exit non-zero on any failure.

(Patterns and the three page agents follow the same template — produce when their phase is reached.)

---

## 10. Pre-launch decisions

Before launching Phase 0, the orchestrator (human) must answer:

1. **Tailwind v3 or v4** for this project?
2. **Next.js 16 (as installed) or 14 (as docs say)** — keep installed, or downgrade?
3. **NextAuth v4 or v5 (Auth.js)**?
4. **Money representation** — integer cents in DB, or `Decimal` with boundary conversion?
5. **Single-tenant launch** with `DEFAULT_TENANT_SLUG`, or multi-tenant routing from day one?
6. **Layer 2:** Untitled UI React via MCP CLI (`UNTITLED.md`). Not CVA/Radix best-of-n.

These answers go into `.claude/STACK_BASELINE.md` and are referenced by every downstream agent.
