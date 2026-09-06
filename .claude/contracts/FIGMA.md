# FIGMA.md — Visual source of truth + Untitled UI implementation

Source of truth for **how agents consume Figma designs** and map them into
Royal Z Lanes code. Read this before implementing any booking or staff/admin UI
from a Figma frame. Install Untitled components per **UNTITLED.md**.

## Source-of-truth split

| Concern | Source of truth |
|--------|------------------|
| Layout, composition, spacing, states, responsive breakpoints | **Figma frame(s)** for that screen (MCP `get_design_context`) |
| Interactive primitives (Button, Input, Select, sidebar, table, …) | **Untitled UI React** under `src/components/base/` and `src/components/application/` — install via Untitled MCP CLI (UNTITLED.md) |
| Brand, surfaces, fonts, radius, dark mode | `src/styles/theme.css` + `data-theme` on `<html>` |
| Domain behavior (hold timer, sheets vs panels, roles) | `.claude/BOOKING_INTERACTIONS.md` / `.claude/STAFF_INTERACTIONS.md` |
| HTML under `docs/wireframes/` | **Historical only** — do not implement from when a Figma frame exists |

## Staff Figma frames

Paste URLs here when frames exist. Employee frames are **direct layout guidance**
(spacing, two-column settings, calendar chrome, reports chart card) — map to
Untitled `base/` + `application/` and stock Untitled semantic colors. Never paste
Figma hex. Do not remap staff brand to amber. Missing fields in the product
(Country, photo upload, notification toggles, Hours City/State/Zip, ⌘K) stay omitted.

File: [booking_v3](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3).
Do **not** copy Untitled dummy chrome from these frames (Untitled logo, ⌘K
search, placeholder Olivia / switch-account menu). **Do** follow Untitled nav
**structure**: Overview + Scheduling accordions (one open at a time), Reporting,
Contacts, Settings, Support, real signed-in account card. Staff `data-theme` follows the device scheme; `data-app="staff"` keeps Untitled purple. Customer `/book` stays light/amber.

| Surface | Viewport | Frame | Code | Apply |
|---------|----------|-------|------|-------|
| Staff shell (AppShell / nav) | Untitled sidebar | — | `AppShell` + `NavRail` | Built — 280px sidebar, hamburger `< lg`, accordion Overview/Scheduling; page content `max-w-[1096px]` centered so side margins grow past 1440 |
| Cockpit | Desktop + mobile | [desktop](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1726-443880&t=w2r3hIJBDYQltPHJ-4) · [mobile](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1726-443918&t=w2r3hIJBDYQltPHJ-4) | `/staff` | Untitled dashboard composition — no dummy chrome (logo, ⌘K, Olivia, fake revenue); rail Dashboard vs Lane Assignments; occupancy chart + real metrics + upcoming |
| Walk-in / booking detail sheets | Untitled slideout | [Slideout menus](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=231-922) | `BottomSheet` + cockpit sheets | Right slideout all breakpoints — `slide-in-from-right` only, ~400px, overlay peek 24px on small screens |
| Schedule | Desktop + mobile + details | [Calendar (desktop)](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19525&t=w2r3hIJBDYQltPHJ-4) · [Reservation details](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19792&t=w2r3hIJBDYQltPHJ-4) · [Mobile calendar](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19824&t=w2r3hIJBDYQltPHJ-4) | `/staff/schedule` | Calendar stacked above the day’s reservation listing; tap a reservation for Untitled right slideout (7720:19792 mapped to booking fields); Block = Add event (ADMIN); list is rail `?view=list` |
| Reporting | Desktop 1440 | [Reports (Desktop)](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=104-3249) | `/staff/reports` | Untitled chart + metrics; chart left with Bookings / Avg value / Busiest day / No-show stacked right (`lg+`); **no in-page Analytics\|Contacts tabs**; Export (no ⌘K) |
| Contacts | Desktop 1440 | [Contacts (Desktop)](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-2437) | `/staff/reports?view=contacts` (+ `/staff/reports/contacts/[id]`) | Rail item (MANAGER+); header Export + Search (no ⌘K); Untitled table (Name / Total Bookings / Last Booking / actions); All Packages filter; right slideout detail; no in-page Reports tabs |
| Settings section switcher | Desktop 1440 | [Header section](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=120-12428) | `SettingsSectionHeader` + `SettingsSectionNav` | Untitled Tabs `type="underline"` `size="sm"` on `lg+`; Select `< lg`; omit ⌘K / search |
| Settings → Profile | Desktop + mobile | [desktop](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-3465) · [mobile](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-8694) | `/staff/settings/profile` | Direct Figma layout; omit photo / notifications / ⌘K |
| Settings → Venue info | Desktop 1440 | [Settings/Venue (Desktop)](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-7420) | `/staff/settings/venue` | Direct Figma layout — no Country field |
| Settings → Operating hours | Desktop 1440 | [Settings/Operating Hours (Desktop)](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-6744) | `/staff/settings/hours` | From/To selects + day checkbox; no Venue address copy |
| Settings (other interiors) | Untitled `lg` | [spacing/grid](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=5245-372829) | pricing, packages, policies | Same AppShell padding as main pages (16px / 32px); footer CTAs `w-full lg:w-auto` |
| Settings → Team | Untitled table | [Team members](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1672-482036) | `/staff/settings/team` | TableCard + Invite; Role column (no Teams); no CSV |
| Settings → Integrations | Untitled list | [Integrations](https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1677-405610) | `/staff/settings/integrations` | Connected apps rows: icon, Learn more, read-only toggle; no ⌘K |
| Support | Untitled `lg` | TBD | `/staff/support` | Venue phone / email / address from `getTenant()` |
| Admin audit | Untitled `lg` | — | `/admin/audit` | Untitled pass — table + badges; ADMIN-only |
| Sign-in | Desktop + mobile | [desktop](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1267-132204) · [mobile](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1267-137926) | `/signin` | Split login (form left, quote image `rounded-l-[80px]` from `lg`; stacked form on mobile). Omit Untitled dummy chrome (logo, Google, Sign up, testimonial carousel). Role-aware routing via `getPostSignInPath`. `data-theme="light"` + `data-app="staff"` (purple). Tenant name from `getTenant()`. |
| Forgot / reset password | Desktop + mobile | [flow](https://www.figma.com/design/yDxNvjNjc4C4NwsEqObb8w/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-VARIABLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1269-1186&t=y0Q5lMnzK3ixXLgG-4) | `/forgot-password`, `/reset-password` | Centered Untitled 4-step flow (request → check email → set password → success). Omit sidebar stepper / Untitled logo / carousel. `PasswordResetScreen` + featured icons. Same light + `data-app="staff"` as sign-in. |

Suggested design order: **shell → cockpit → walk-in/detail sheets → schedule → reports → settings**.
Design in Figma **with the Untitled UI library** so node names match CLI component names.

### Applying a pasted employee frame

When implementing a **Ready** row above:

1. Load `.cursor/skills/untitled-figma/SKILL.md` + figma-design-to-code; `get_design_context` for that node.
2. Keep AppShell. Settings pages already mount `SettingsSectionHeader` (tabs / Select) — restyle **`{children}` only**.
3. Map to Untitled `base/` + `application/` (table, metrics, pagination, input, checkbox, select, button). Install via Untitled MCP/CLI if missing. No new `ui/` call sites on staff.
4. Existing User / Tenant / reports actions stay. No schema unless `SCHEMA_MIGRATIONS.md` is planned.
5. **Venue:** Figma adds a Country select. Tenant has no country column — omit (same rule as Profile photo/timezone). State may stay a select if it still persists inside `Tenant.address`. Do not add a country field.
6. **Hours:** Figma weekly checkboxes + From/To selects, lane count, bowlers/lane, booking min/max duration. City/State/Zip under Lane Configuration in the frame is a copy from Venue — **do not** add address fields on hours.
7. **Reporting / Contacts:** Keep Export; do not add global ⌘K. **No in-page Analytics|Contacts tabs** — rail URLs are the source of truth. Period chips + Untitled chart + metrics + tables.
8. Paste any **mobile** sibling URL into this table when it exists. Until then, one composition with Untitled `lg` (1024px) layout utilities.

Other settings interiors (pricing, packages, policies) use the same Untitled two-column form kit and AppShell padding as main pages (label left / controls right on `lg+`). Team and Integrations use the Untitled table/list frames. Omit fields that are not in the product.

## Mandatory pipeline (Figma → code)

1. User provides a Figma URL with `node-id` (or a frame linked in this file / PAGES / staff/0N).
2. Load **untitled-figma** (`.cursor/skills/untitled-figma/SKILL.md`) and **figma-design-to-code**.
3. Call `get_design_context` (prefer `plugin-figma-figma`; Desktop MCP as fallback).
4. Treat MCP output as a **reference** — adapt into Untitled `base/` + `application/` + `patterns/` / `chrome/`.
5. If a component is missing: Untitled MCP `search_components` → `get_component` → CLI (never invent PRO).
6. Never paste Figma hex, absolute layout CSS, or invent one-off primitives.
7. Prefer Untitled / Code Connect component names when available.
8. Paste the frame URL into this table, PAGES.md, and the matching `staff/0N_*.md`.

## Untitled UI rules

- Layer 2 is Untitled UI React only (`base/`, `application/`, `foundations/`).
  `ui/` is temporary re-exports. See UNTITLED.md.
- Do **not** resurrect Radix Slot / hand-rolled `--color-action` button variants.
- Colors: Untitled semantic utilities from `theme.css`
  (`bg-primary`, `text-secondary`, `bg-brand-solid`, …). Never raw palette
  utilities (`bg-amber-500`, `text-stone-600`). Staff dark uses stock Untitled
  brand (purple). Do not remap employee brand to amber.
- `dark:` is allowed **only** because `@custom-variant dark` is wired to
  `[data-theme="dark"]` — not `prefers-color-scheme` or `.dark-mode`.

## Responsive

- If Figma provides mobile / tablet / desktop frames, fetch each node.
- Implement one composition with layout utilities; same tokens both themes.
- Figma widths **supersede** documented `BookingSurface` max-widths when they conflict —
  update the pattern, do not defend the old phone-column docs.
- Staff nav: Untitled `lg` (1024px). Desktop = 280px sidebar. Below `lg` =
  hamburger + overlay (no bottom tabs). Accordion sections open one at a time.

## Token gaps

If Figma introduces a color/radius/shadow not in `theme.css`:

1. Add or extend a semantic token in `theme.css` (brand scale for tenant color).
2. Then implement the UI.
3. Never inline a temporary hex value.

Tenant rebrand rule still applies: only brand / action family (+ dark chrome if needed)
changes per venue — not component files.

## Theme

- Customer: `data-theme="light"` (amber until `/book` is redesigned).
- Staff / admin: device color scheme via `StaffThemeScope` + `theme` cookie. `data-app="staff"` keeps Untitled purple on light.
- Sign-in (`/signin`) and password reset (`/forgot-password`, `/reset-password`): always light + `data-app="staff"` so Figma auth screens use Untitled purple (staff brand), independent of tenant presets.
- Do not introduce `.dark-mode` or `next-themes` as a second system.

## Assets

Download Figma/MCP exports into the repo (`public/` or committed assets).
Do not leave expiring MCP asset URLs in source.

## Wireframes

`docs/wireframes/**` is pre-Figma visual history. Agents **must not** open HTML
wireframes as the visual source of truth when a Figma frame exists for that screen.
See `docs/wireframes/README.md`.

## Gate

After Figma-driven UI work: `npm run drift` must pass.
Before commit: `npm run verify`.
