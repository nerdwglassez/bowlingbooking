# CURSOR_RULES.md
# Rules Cursor must follow in every response for this project

## The most important rule
Read DESIGN_SYSTEM.md before writing any component, style, or page.
All visual decisions flow from `theme.css` (Untitled) plus the legacy token bridge.

---

## Token usage

ALWAYS use Untitled semantic utilities from `theme.css` OR legacy CSS custom
properties (`var(--color-*)`, `var(--surface-*)`) in unreworked patterns.
NEVER use raw hex values, Tailwind palette classes, or hardcoded font names.

```
WRONG: color: '#1C1917'            RIGHT: className="text-primary"  OR  color: var(--color-text-primary)
WRONG: background: '#F59E0B'       RIGHT: className="bg-brand-solid"
WRONG: className="bg-amber-500"    RIGHT: Button color="primary" (Untitled) or variant="primary" (ui/ shim)
WRONG: fontFamily: 'Fraunces'      RIGHT: fontFamily: var(--font-display)
WRONG: color: var(--palette-stone-500)  RIGHT: className="text-secondary"
```

Palette tokens (`--palette-*`) are NEVER used in components.
They exist only to define semantic tokens in `tokens.css`.

---

## Component hierarchy — always follow this

Layer 1 → Layer 2 → Layer 3 → Layer 4
Tokens  → Untitled primitives → Patterns → Pages

- Pages contain layout (flex, grid, gap, padding) and component composition ONLY
- Pages never contain color, typography, or border styles
- Pattern components compose from `base/` / `application/` (or `ui/` shims) only
- Untitled files under `base/`, `application/`, and `foundations/` are the only
  place interactive primitives are implemented. `ui/` is re-exports only.

If you need a new visual variant, install or extend the Untitled component.
Never create a one-off styled element in a page or pattern.

---

## File locations

Untitled theme:   src/styles/theme.css
Legacy aliases:   src/styles/tokens.css
Global styles:    src/app/globals.css
Tenant themes:    src/styles/themes/{slug}.css
Base primitives:  src/components/base/
Application UI:   src/components/application/
Foundations:      src/components/foundations/
UI shims:         src/components/ui/ (temporary re-exports)
Patterns:         src/components/patterns/
Chrome:           src/components/chrome/
Business logic:   src/lib/
Hooks:            src/hooks/
Context:          src/context/
Types:            src/types/
API routes:       app/api/
Customer pages:   app/(customer)/
Staff pages:      app/(staff)/
Admin pages:      app/(admin)/
Figma:            .claude/contracts/FIGMA.md
Untitled install: .claude/contracts/UNTITLED.md
Wireframes:       docs/wireframes/ (historical)

---

## Figma + Untitled

Before building any screen: Figma frame URL (FIGMA.md) + Untitled components (UNTITLED.md).
Load `.cursor/skills/untitled-figma/SKILL.md` when implementing UI from design.
`docs/wireframes/` is historical — do not implement from it when Figma exists.

---

## Tailwind usage

Tailwind IS used for: layout, spacing, flexbox, grid, sizing, **and Untitled
semantic color utilities** (`bg-brand-solid`, `text-secondary`, `bg-primary`, …).

`dark:` is allowed **only** because `@custom-variant dark` maps to
`[data-theme="dark"]`. Never `prefers-color-scheme`.

```
OK:    className="flex items-center gap-4 px-4 py-3 w-full"
OK:    className="bg-brand-solid text-white"
OK:    className="dark:bg-primary"   ← Untitled, resolved via data-theme
WRONG: className="bg-amber-500 text-white"
WRONG: className="text-stone-600 border-stone-200"
```

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

Staff app: data-theme follows the device scheme (`StaffThemeScope`)
Customer app: data-theme="light" (Untitled purple by default; tenant presets may rebrand)
Untitled `dark:` utilities follow `data-theme`. Never a second theme system.

---

## Multi-tenant

Never hardcode venue name, address, colors, or phone in components.
Always read from getTenant() or pass as props from server component.
Theme is loaded by getTenant() via tenant.themeSlug.

---

## When adding a new feature

1. Check Figma frame / FIGMA.md for the visual spec
2. Check UNTITLED.md — install missing components via MCP CLI
3. Check .claude/ context files for domain rules
4. Add types to src/types/ first
5. If new UI needed: Untitled MCP install into `base/` / `application/`, not a one-off
6. Business logic goes in src/lib/
7. Page composes patterns; pattern composes Untitled primitives
8. No new styles at page level — ever
