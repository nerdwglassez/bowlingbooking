# PRIMITIVES.md — Untitled UI Layer 2

Source of truth for Untitled UI React under `src/components/base/`,
`src/components/application/`, and `src/components/foundations/`.

`src/components/ui/` is **temporary re-exports** of a compatibility API for
unreworked call sites. Do not add new implementations there.

Install path, MCP tools, and folder rules: **`.claude/contracts/UNTITLED.md`**.

## Rules

1. **Untitled only.** Do not resurrect Radix Slot / hand-rolled `--color-action`
   button class maps. If a component is missing, Untitled MCP
   `get_component` / `get_component_bundle` → run the CLI into native folders.
   Never invent a PRO component.
2. **Semantic utilities OK:** `bg-brand-solid`, `text-secondary`, `ring-primary`,
   `bg-primary`, etc. from `theme.css`.
3. **Banned:** raw palette utilities (`bg-amber-500`, `text-stone-600`), inventing
   `--staff-*` tokens, page-level styling, committing CLI license keys.
4. **Theme:** `dark:` utilities resolve via `@custom-variant dark` →
   `[data-theme="dark"]` in `globals.css`. Staff/admin follow the device scheme.
5. **No business logic** in Layer 2 (no Prisma, Stripe, booking math).
6. **`'use client'`** is allowed for React Aria / interactive Untitled primitives.
7. **Public API compatibility:** existing call sites use `variant` / `size` /
   `fullWidth` / `loading` / `asChild` on `ui/button`. Map those in the shim —
   new staff code imports Untitled `base/` buttons directly.

## Native folders (CLI)

Untitled CLI writes paths like `@/components/base/buttons/button` and
`@/components/application/app-navigation/sidebar-navigation`. After install,
point `cx` at `@/lib/cx`.

## `ui/` re-exports (sunset)

These files must stay **re-exports or thin wrappers**, not independent implementations:

| File | Maps onto |
|------|-----------|
| `button.tsx` | Untitled base button + Royal Z `variant`/`fullWidth`/`loading`/`asChild` |
| `input.tsx` | Untitled base input |
| `select.tsx` | Untitled base select (or native shim until Figma rewrite) |
| `checkbox.tsx` | Untitled base checkbox |
| `toggle.tsx` | Untitled base toggle |
| `badge.tsx` | Untitled badges |
| `card.tsx` | Surface card (may remain a thin pattern wrapper until Figma) |
| `skeleton.tsx` | Loading pulse |
| `password-input.tsx` | Client; Untitled Eye icons |

## Adding a component

1. Untitled MCP `search_components` → `get_component` → run CLI.
2. Point `cx` / helpers at `@/lib/cx` (and `@/lib/is-react-component` if needed).
3. Ensure colors use theme semantic utilities (stock Untitled brand by default; tenant presets may remap brand/action).
4. Run `npm run drift` and `npm run verify`.

## Related

- Install + MCP: `.claude/contracts/UNTITLED.md`
- Visual SoT: `.claude/contracts/FIGMA.md`
- Theme bridge: `src/styles/theme.css`, `src/app/globals.css`
- Patterns: `.claude/contracts/PATTERNS.md`
- Skill: `.cursor/skills/untitled-figma/SKILL.md`
