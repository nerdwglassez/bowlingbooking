# Royal Z Lanes — Online Booking System

Lane reservation system for Royal Z Lanes. Built to be licensed to other bowling alleys.

## Changelog

Notable releases are recorded in [CHANGELOG.md](./CHANGELOG.md). In Cursor, run **`/changelog`** (or ask to update the changelog) to refresh the `[Unreleased]` section from `main`.

## Quick start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in .env.local values

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

## Project structure

```
.claude/          AI context files — read before prompting Cursor
  CURSOR_RULES.md
  DESIGN_SYSTEM.md
  BOOKING_DOMAIN.md
  PROJECT_OVERVIEW.md

.cursorrules      Cursor reads this automatically every session

docs/
  wireframes/
    customer/     Booking flow, dashboard, cancel/reschedule
    staff/        Cockpit, schedule, walk-in, reports
    admin/        All settings screens

src/
  styles/
    theme.css     Layer 1 — Untitled semantic theme (edit here for global changes)
    tokens.css    Legacy aliases for unreworked patterns
    globals.css   Tailwind + theme + token bridge + tenant themes
    themes/       Per-tenant theme overrides (touch only for new tenant onboarding)

  components/
    base/         Layer 2 — Untitled base primitives (CLI)
    application/  Layer 2 — Untitled application blocks (sidebar, table, …)
    foundations/  Layer 2 — Untitled foundations as needed
    ui/           Temporary re-exports for unreworked call sites
    patterns/     Layer 3 — composed patterns (booking shell, price footer...)
    chrome/       Staff/admin shell (AppShell, NavRail)

  lib/            Business logic (lane-logic, pricing, auth, tenant, stripe...)
  hooks/          React hooks (useTheme, useBooking...)
  context/        React context (BookingContext, AuthContext)
  types/          Shared TypeScript types

app/
  (customer)/     Customer-facing routes — light mode
  (staff)/        Staff routes — dark mode
  (admin)/        Admin settings routes
  api/            Server-only API routes

prisma/
  schema.prisma   Database schema
```

## Design system

All visual decisions flow from `src/styles/theme.css` (Untitled) plus Figma frames.

- **Update a color globally**: change semantic tokens in `theme.css`
- **Add a tenant brand**: create `src/styles/themes/{slug}.css`, override brand / action family
- **Add a UI component**: Untitled MCP CLI into `src/components/base/` or `application/` (see `.claude/contracts/UNTITLED.md`)
- **Never**: raw hex values, Tailwind palette classes, or styles in page files

See `.claude/DESIGN_SYSTEM.md` for the full spec.

## Design

Visual source of truth is **Figma** (see `.claude/contracts/FIGMA.md`).
Primitives are **Untitled UI React** under `src/components/base/` and
`src/components/application/` (see `.claude/contracts/UNTITLED.md`).
`docs/wireframes/` is historical only.

## AI-assisted development

This project is set up for Cursor (vibe coding).

- `.cursorrules` — loaded automatically every session
- `.claude/` — context files to attach when starting new features
- Figma — paste the frame URL when building a screen

When starting a new feature in Cursor:
1. Attach `.claude/CURSOR_RULES.md`
2. Attach `.claude/DESIGN_SYSTEM.md` and `.claude/contracts/UNTITLED.md`
3. Paste the Figma frame URL (see `.claude/contracts/FIGMA.md`)
4. Attach `.claude/BOOKING_DOMAIN.md` if working on booking logic
