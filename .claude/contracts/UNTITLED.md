# UNTITLED.md — Untitled UI React Layer 2

Source of truth for **how agents install and use Untitled UI React**. Read this
before adding any primitive or application component. Visual layout still comes
from Figma (see `FIGMA.md`).

## Folder map (locked)

| Path | Role |
|------|------|
| `src/components/base/` | Untitled **base** primitives (button, input, select, badges, …) |
| `src/components/application/` | Untitled **application** blocks (sidebar, table, modal, metrics, …) |
| `src/components/foundations/` | Untitled **foundations** (featured-icon, logos, payment icons) |
| `src/components/shared-assets/` | Untitled CLI illustrations / background patterns (do not restyle) |
| `src/components/ui/` | **Temporary re-exports** mapping the old Button/Input/Select/etc. public API onto `base/` so unreworked call sites (customer booking) keep compiling |
| `src/components/chrome/` | Staff/admin shell only — composes `application/` + `base/`; owns `fixed`/`sticky`. Staff overlays: `BottomSheet` `placement="end"` (Untitled right slideout). Do not dump `placeholder-menu` into pages. |

New staff/admin code imports from `@/components/base/...` and
`@/components/application/...`. Do **not** add new call sites under `ui/` except
the re-export shims.

## Install only via Untitled MCP + CLI

1. `search_components` or `list_components` (category: `base` | `application` | `foundations`).
2. `get_component` (one) or `get_component_bundle` (many). Default library **version 8**.
3. Run the returned `npx untitledui@latest add …` command in the repo root.
4. After install: point `cx` / helpers at `@/lib/cx` (and `@/lib/is-react-component` if the CLI dropped duplicates). Staff dark theme uses stock Untitled brand; light/customer keeps amber.
5. Run `npm run drift`.

**Never:**

- Hand-roll a PRO component. If MCP says PRO access is required, follow `agent_instructions` — do not invent a substitute.
- Commit license keys or tokens that appear in CLI output.
- Dump a full page template (`get_page_template_files`) into `src/app`. Templates are **reference only** (how Untitled composes sidebar + content). They pull extras (video player, QR, …) we do not want in the booking app.
- Copy-paste Untitled docs into `src/components/ui/` as the primary path. CLI → native folders.

## MCP tools (namespace `user-untitledui`)

| Tool | Use |
|------|-----|
| `list_components` | Browse by category |
| `search_components` | Natural-language search (prefer this when the Figma node name is unclear) |
| `get_component` | CLI command for one component |
| `get_component_bundle` | CLI command for several components |
| `search_icons` | **Before** importing any icon — returns PascalCase names from `@untitledui/icons` |
| `get_page_templates` / `get_page_template_files` | Reference only — do not install into the app |

PRO access is available on this project. Still do not reinvent PRO components.

## Icons

Use `@untitledui/icons` after `search_icons`. Stop adding Lucide in staff chrome.
Lucide in unreworked customer patterns can wait for a customer Figma pass.

## Theme

- Colors: Untitled semantic utilities from `theme.css` (`bg-brand-solid`, `text-secondary`, `bg-primary`, …).
  Staff uses stock Untitled brand (purple) in light and dark (`data-app="staff"`). Light/customer brand stays amber until `/book` is redesigned.
- `dark:` is allowed **only** because `@custom-variant dark` maps to `[data-theme="dark"]` in `globals.css`. Never `@media (prefers-color-scheme)` in CSS.
- Staff/admin: `StaffThemeScope` syncs `data-theme` to the device scheme. Customer: light default.

## `ui/` sunset

`src/components/ui/` exists so existing `variant` / `size` / `fullWidth` /
`loading` / `asChild` call sites keep working. When a screen is rewritten from
Figma, import Untitled components from `base/` / `application/` directly and
drop the shim at that call site.

Do not add new implementations under `ui/` — only re-exports.

## Related

- Visual SoT: `.claude/contracts/FIGMA.md`
- Layer 2 contract (shim list): `.claude/contracts/PRIMITIVES.md`
- Theme: `src/styles/theme.css`, `src/app/globals.css`
- Agent skill: `.cursor/skills/untitled-figma/SKILL.md`
