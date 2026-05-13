# Royal Z Lanes — Online Booking System

Lane reservation system for Royal Z Lanes. Built to be licensed to other bowling alleys.

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
    tokens.css    Layer 1 — master token definitions (edit here for global changes)
    globals.css   Base styles + imports tokens.css
    themes/       Per-tenant theme overrides (touch only for new tenant onboarding)

  components/
    ui/           Layer 2 — primitive components (button, card, input, badge...)
    patterns/     Layer 3 — composed patterns (booking shell, price footer...)

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

All visual decisions flow from `src/styles/tokens.css`.

- **Update a color globally**: change one token value in `tokens.css`
- **Add a tenant brand**: create `src/styles/themes/{slug}.css`, override 4 tokens
- **Add a UI variant**: add to the component file in `src/components/ui/`
- **Never**: raw hex values, Tailwind color classes, or styles in page files

See `.claude/DESIGN_SYSTEM.md` for the full spec.

## Wireframes

All screens are pre-designed in `docs/wireframes/`.
Open any HTML file in a browser to view the interactive wireframe.
Wireframes use the same token system as production — they are the visual spec for Cursor.

## AI-assisted development

This project is set up for Cursor (vibe coding).

- `.cursorrules` — loaded automatically every session
- `.claude/` — context files to attach when starting new features
- Wireframes — attach the relevant HTML when building a screen

When starting a new feature in Cursor:
1. Attach `.claude/CURSOR_RULES.md`
2. Attach `.claude/DESIGN_SYSTEM.md`
3. Attach the relevant wireframe from `docs/wireframes/`
4. Attach `.claude/BOOKING_DOMAIN.md` if working on booking logic
