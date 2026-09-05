---
name: untitled-figma
description: >-
  Implement UI from Figma using Untitled UI React. Use when the user pastes a
  Figma frame URL, asks to build/restyle a screen, install Untitled components,
  or update staff/customer chrome from design.
---

# Untitled UI + Figma implementation

Load this skill before implementing any UI from a Figma frame or adding Untitled
components.

## Read first

1. `.claude/contracts/FIGMA.md` — Figma is layout SoT (direct guidance for staff frames)
2. `.claude/contracts/UNTITLED.md` — install path, folder map, MCP rules
3. `.claude/DESIGN_SYSTEM.md` — theme.css + `data-theme`
4. Surface contract: `STAFF_INTERACTIONS.md` + one `staff/0N_*.md`, or `BOOKING_INTERACTIONS.md`

Staff colors: Untitled semantic utilities, **stock purple brand** (`data-app="staff"`) in light and dark. Do not remap employee brand to amber. Customer `/book` stays amber until redesigned. Theme follows the device scheme via `data-theme`.

## Pipeline

1. User provides a Figma URL with `node-id` (or a frame already linked in FIGMA.md / PAGES.md / staff/0N).
2. Load the **figma-design-to-code** skill, then Figma MCP `get_design_context` (+ screenshot). Treat output as **reference**.
3. Map nodes to already-installed Untitled files under `src/components/base/` and `src/components/application/`.
4. If a piece is missing: Untitled MCP `search_components` → `get_component` or `get_component_bundle` → run the returned CLI. Never hand-roll PRO components. Never commit license keys.
5. Compose a **pattern** (or chrome, if it owns `fixed`/`sticky`). Do not style the page. Do not paste Figma hex.
6. Paste the frame URL into FIGMA.md, PAGES.md, and the matching staff/0N file. That URL becomes visual SoT.

## Layer map

| Need | Put it in |
|------|-----------|
| Viewport chrome (`fixed`/`sticky` staff shell) | `src/components/chrome/` composing `application/` + `base/` |
| Named visual concept with domain props | `src/components/patterns/` |
| Route layout + state + data | `src/app/.../page.tsx` — composition only |
| New Untitled primitive | CLI into `base/` / `application/` / `foundations/` |

Customer booking may still import `@/components/ui/*` shims. New staff code must
import `@/components/base/...` and `@/components/application/...`.

## Icons

Call Untitled MCP `search_icons` before importing. Use `@untitledui/icons`. Do
not add Lucide in staff chrome.

## Do not

- Implement from `docs/wireframes/` when a Figma frame exists
- Dump Untitled page templates into `src/app` (including `slideout-menus/placeholder-menu` — compose `BottomSheet` instead)
- Use bottom-sheet or diagonal motion on staff overlays — `slide-in-from-right` only
- Invent `--staff-*` tokens or remap staff brand scale to amber
- Use raw palette utilities (`bg-amber-500`) or raw hex
- Use `prefers-color-scheme` (Untitled `dark:` is OK via `@custom-variant dark`)

## Gate

`npm run drift` after UI work. `npm run verify` before commit.
