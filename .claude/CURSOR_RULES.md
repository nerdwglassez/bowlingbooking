# CURSOR_RULES.md
# Rules Cursor must follow in every response for this project

## The most important rule
Read DESIGN_SYSTEM.md before writing any component, style, or page.
All visual decisions flow from the token system defined there.

---

## Token usage

ALWAYS use CSS custom properties for all colors, fonts, radius, shadows.
NEVER use raw hex values, Tailwind color classes, or hardcoded font names.

```
WRONG: color: '#1C1917'            RIGHT: color: var(--color-text-primary)
WRONG: background: '#F59E0B'       RIGHT: background: var(--color-action)
WRONG: className="bg-amber-500"    RIGHT: use Button variant="primary"
WRONG: fontFamily: 'Fraunces'      RIGHT: fontFamily: var(--font-display)
WRONG: color: var(--palette-stone-500)  RIGHT: color: var(--color-text-secondary)
```

Palette tokens (--palette-*) are NEVER used in components.
They exist only to define semantic tokens in tokens.css.

---

## Component hierarchy — always follow this

Layer 1 → Layer 2 → Layer 3 → Layer 4
Tokens  → Primitives → Patterns → Pages

- Pages contain layout (flex, grid, gap, padding) and component composition ONLY
- Pages never contain color, typography, or border styles
- Pattern components compose from ui/ primitives only — no raw styles
- Primitive components in ui/ are the ONLY place each element is styled

If you need a new visual variant, add it to the component file.
Never create a one-off styled element in a page or pattern.

---

## File locations

Tokens:           src/styles/tokens.css
Global styles:    src/styles/globals.css
Tenant themes:    src/styles/themes/{slug}.css
Primitives:       src/components/ui/
Patterns:         src/components/patterns/
Business logic:   src/lib/
Hooks:            src/hooks/
Context:          src/context/
Types:            src/types/
API routes:       app/api/
Customer pages:   app/(customer)/
Staff pages:      app/(staff)/
Admin pages:      app/(admin)/
Wireframes:       docs/wireframes/

---

## Wireframe reference

Before building any screen, check docs/wireframes/ for the matching HTML file.
The wireframes show exact component composition, spacing, and state variations.
Use them as visual spec — do not deviate from the token system they demonstrate.

Customer screens: docs/wireframes/customer/
Staff screens:    docs/wireframes/staff/
Admin screens:    docs/wireframes/admin/

---

## Tailwind usage

Tailwind IS used for: layout, spacing, flexbox, grid, sizing
Tailwind is NOT used for: colors, typography colors, dark mode variants

```
OK:    className="flex items-center gap-4 px-4 py-3 w-full"
OK:    className="grid grid-cols-2 gap-3"
WRONG: className="bg-amber-500 text-white dark:bg-amber-400"
WRONG: className="text-stone-600 border-stone-200"
```

Never use dark: prefix. The data-theme system handles both modes via CSS vars.

---

## TypeScript

All props must be typed. No `any`.
Prefer explicit return types on all functions.
Use the types in src/types/ — add to them when needed.

---

## Business logic

Lane count:    always Math.ceil(bowlerCount / 6) — see src/lib/lane-logic.ts
Pricing:       always through calculatePrice() — see src/lib/pricing.ts
Tenant:        always through getTenant() — see src/lib/tenant.ts
Auth:          role checks server-side only — never trust client role claims
Refunds:       server-side only at POST /api/staff/bookings/[id]/refund
               MANAGER or ADMIN role required — STAFF cannot refund

---

## Dark mode

Staff app: data-theme="dark" on <html> — always dark
Customer app: data-theme="light" default, toggleable
Set in layout.tsx for each route group.
Components need no conditional logic — tokens handle both modes.

---

## Multi-tenant

Never hardcode venue name, address, colors, or phone in components.
Always read from getTenant() or pass as props from server component.
Theme is loaded by getTenant() via tenant.themeSlug.

---

## When adding a new feature

1. Check docs/wireframes/ for the visual spec
2. Check .claude/ context files for domain rules
3. Add types to src/types/ first
4. If new UI pattern needed: add variant to existing ui/ component OR create new ui/ component
5. Business logic goes in src/lib/
6. Page composes patterns; pattern composes ui/ components
7. No new styles at page level — ever
