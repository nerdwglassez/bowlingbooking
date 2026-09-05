# staff/07_RESPONSIVE_PWA.md
# Section 7 — Desktop responsive layout and PWA manifests
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       DESIGN_SYSTEM.md (breakpoints, tokens)
# Code contract: contracts/STAFF.md (NavRail breakpoints)
# Visual: Figma URL TBD — paste into FIGMA.md. Historical HTML under docs/wireframes/ is not visual SoT.
# Colors: Untitled semantic utilities (theme.css). Do not introduce --staff-* tokens.
# Build status:  Chrome + interiors on Untitled (`lg` 1024px); PWA TBD

---

## Breakpoints

```
Mobile:   < 1024px   — hamburger header + overlay drawer (Untitled `lg`)
Desktop:  ≥ 1024px   — 280px left sidebar
```

The staff app is **tablet-first**, not desktop-first.
Most front desk and floor staff use an iPad or iPhone.
Desktop is a secondary surface used by managers and admins
for settings, reports, and scheduling.

NavRail matches Untitled: sidebar at `lg` (1024px), hamburger below that.
No bottom tab bar.

All touch targets remain 44px minimum regardless of breakpoint.

---

## Navigation: Mobile + Tablet vs Desktop

### Mobile + Tablet (< 1024px)
- Top hamburger opens the same sidebar contents in an overlay
- Overview / Scheduling accordions (one open at a time)
- Reporting + Contacts hidden for STAFF
- Footer: Settings, Support, signed-in account card
- Role-based items hidden entirely (not disabled)

### Desktop (≥ 1024px)
- Left sidebar 280px, fixed
- Background: `bg-primary`
- Border right: `border-secondary`
- Top: venue name (`--font-display`)
- Nav: Untitled item styles (icon + label; accordion children indent)
- Content area: `lg:ml-[280px]`
- No bottom tab bar on any breakpoint

---

## Staff Header: Desktop Adaptations

Do **not** add a second in-content header that repeats the sidebar account
card (role badge + avatar). Venue name stays in the sidebar.

### `< lg`
- Hamburger header (venue name + menu button)
- Page title in the content area (`StaffPageHeader`: `text-display-sm font-semibold text-primary`)
- Overlays: Untitled right slideout (`BottomSheet` `placement="end"`); 44px min touch

### `lg+`
- 280px sidebar with venue name + account card
- Content: page title + optional actions only
- Booking detail: Untitled right slideout (~400px) at all breakpoints
- Metrics in a row; tables with headers

---

## Cockpit Tab: Desktop Layout

### Overview Sub-view (desktop)
- Two-column layout: stats + upcoming list (left) · lane grid (right)
  Left: ~60% width — stat hierarchy, search, upcoming list
  Right: ~40% width — lane grid (3 columns → 4 columns on desktop)
- Sub-view toggle: same pill toggle, same position above content
- Stat hierarchy: horizontal row (Total left → children right)
  instead of vertical stack on mobile
- Upcoming list: becomes a table with column headers
  Time | Customer | Bowlers/Package | Lane | Status | Actions
- Booking detail: Untitled right slideout (~400px)
  Slides in from the right: translateX(100%)→0 (never translateY)
  Overlay: bg-overlay/70 + backdrop blur
  Panel height: 100vh, fixed right

### Lanes Sub-view (desktop)
- Timeline takes full content width
- All lanes visible without vertical scroll
- More time visible in default window (defaults to 6hr on desktop)
- Horizontal scrolling disabled on desktop
- Now line still renders at current time
- Tapping empty track: shows "Walk-in on Lane X" tooltip

### Walk-in FAB (desktop)
- FAB remains visible (bottom right of content area, above status bar)
- Walk-in booking opens as the same right slideout (~400px)
- Same 3-step flow, panel layout instead of sheet layout

---

## Booking Detail: Desktop

Untitled right slideout at all breakpoints (including `< lg`).
Never a bottom sheet. Never combine `slide-in-from-bottom` with
`slide-in-from-right`.

- Width: ~400px (`max-w-[400px]`; 24px overlay peek on small screens)
- Height: 100vh
- Background: bg-primary
- Left border: 1px border-secondary
- Animation: translateX(100%)→0 only
- Overlay: bg-overlay/70 + backdrop blur
- Dismiss: tap overlay, Escape, or X in the header

### Check-in Checklist (desktop)
- Panel content replaces in place
- Same checklist items and behavior as mobile
- Confirm button at bottom of panel (sticky)

---

## Booking Modification: Desktop

- All states render within the right slideout
- Field editor replaces content inside the same panel
- No bottom-sheet motion on employee overlays

---

## Walk-in Flow: Desktop

- Untitled right slideout (~400px) at all breakpoints
- 3-step flow within the panel
- Step indicator in panel header (same dot pattern)
- Overlay covers content behind the panel
- All other behavior identical at both breakpoints

---

## Schedule Tab: Desktop

- Calendar: centered, max-width 480px (not stretched)
- Day detail: renders to the RIGHT of the calendar as a column
  Side-by-side layout instead of below
  Day detail column: ~40% of content area
- Block creation: Untitled right slideout (~400px)
- List view: wider visible area, more blocks per scroll

---

## Reports Tab: Desktop

### Analytics Sub-view (desktop)
- Metrics grid: 3 columns (revenue card still full width)
- Mini bar charts: wider, more data points visible
- Package breakdown: table-style with column headers
- Period chips: same horizontal strip

### Contacts Sub-view (desktop)
- Two-panel layout: contact list (left) · contact detail (right panel)
- Contact list: fixed left column
- Contact detail: slides in as right panel on contact tap
  No page navigation on desktop — panel stays within layout
- Export button: same position in content area

---

## Settings: Desktop and mobile

Visual SoT: Profile + Venue + Hours frames in FIGMA.md (desktop tabs, mobile section Select). Reporting and Contacts desktop frames are also in FIGMA.md (`/staff/reports`).

- NavRail “Settings” is a single footer item — do not expand children in the rail
- Desktop (`md+`): in-page horizontal tabs under the Settings heading
- Mobile: section Select; Sign out is the last option; AppShell hamburger stays
- `/staff/settings` redirects to `/staff/settings/profile`
- Unsaved-changes guard wraps AppShell so tab/Select/rail navigation is intercepted when a form is dirty

Do not copy Untitled logo, ⌘K, or dummy accounts. Hamburger `< lg` is intentional.

---

## Staff overlay rules (Untitled slideouts)

Employee overlays are Untitled **right slideouts** at every breakpoint
(Figma node `231:922`). `BottomSheet` default `placement="end"`:
full height, ~400px, `slide-in-from-right` only. Customer `/dashboard`
keeps `placement="bottom"`.

| Surface | Overlay |
|---|---|
| Booking detail | Right slideout |
| Check-in checklist | Within booking detail slideout |
| Field editor | Within modification slideout |
| Cancel | Within booking detail slideout |
| Walk-in | Right slideout |
| Block creation | Right slideout |
| Employee detail / invite | Right slideout |
| Integration detail | Right slideout |
| Package detail (customer `/book`) | Customer bottom sheet — do not restyle |

Confirmations (sign-out, unsaved settings) also use the staff right slideout.

---

## Touch Target Rules (All Breakpoints)

Minimum 44×44px for all interactive elements:
- Lane cards in grid: enforced via aspect-ratio and min-size
- Calendar day cells: same
- Tab bar items: min-width 60px, height auto (48px+ with padding)
- Stepper buttons: 44×44px on mobile, 36×36px acceptable on desktop
- Checkbox/toggle hit areas: 44px height minimum

---

## PWA Configuration

Both the customer app and staff app are installable as PWAs
(Progressive Web Apps) from Safari on iOS and Chrome on Android/desktop.

They save as **separate apps** with distinct icons, names, and start URLs.

### Two Manifests

```
public/
  manifest-customer.json   ← customer booking app
  manifest-staff.json      ← staff cockpit app
  icons/
    customer-192.png        ← amber icon on warm stone
    customer-512.png
    staff-192.png           ← amber icon on deep purple
    staff-512.png
```

### Customer Manifest
```json
{
  "name": "Royal Z Lanes",
  "short_name": "Royal Z",
  "description": "Book lanes at Royal Z Lanes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F2EE",
  "theme_color": "#1E0A2E",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/customer-192.png",
      "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/customer-512.png",
      "sizes": "512x512", "type": "image/png",
      "purpose": "any maskable" }
  ]
}
```

Notes:
- theme_color: deep purple (#1E0A2E) matches the app header color
  so iOS/Android status bar blends with the app
- orientation: portrait — customer booking is portrait-only
- background_color: warm off-white matches --surface-ground

### Staff Manifest
```json
{
  "name": "Royal Z — Staff",
  "short_name": "RZ Staff",
  "description": "Royal Z Lanes staff operations",
  "start_url": "/staff",
  "display": "standalone",
  "background_color": "#1E0A2E",
  "theme_color": "#1E0A2E",
  "orientation": "any",
  "icons": [
    { "src": "/icons/staff-192.png",
      "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/staff-512.png",
      "sizes": "512x512", "type": "image/png",
      "purpose": "any maskable" }
  ]
}
```

Notes:
- orientation: "any" — staff need landscape on iPad for the lane timeline
- start_url: "/staff" — home screen icon always opens cockpit
- background_color and theme_color both deep purple (#1E0A2E)
  so launch screen and status bar match

### Next.js Head Tags

In app/layout.tsx (customer app root):
```html
<link rel="manifest" href="/manifest-customer.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style"
      content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Royal Z" />
```

In app/staff/layout.tsx (staff app root):
```html
<link rel="manifest" href="/manifest-staff.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="RZ Staff" />
```

apple-mobile-web-app-capable is REQUIRED for iOS Safari full-screen
mode. Without it the address bar stays visible after saving to
home screen.

### Multi-tenant Manifest Note
Manifest name and short_name come from the tenant record —
NOT hardcoded.

Implementation:
- Create app/manifest-customer.json/route.ts as a dynamic route
- Reads tenant from subdomain (or domain mapping)
- Returns manifest JSON with tenant.name injected
- Each licensed venue's saved app shows their own name on home screen

This is how "Royal Z Lanes" becomes "Kingpin Bowling" for a different
venue without any code changes.

### Staff Installation Instructions
Safari → visit /staff URL → Share button → "Add to Home Screen" → Add.
Takes 10 seconds. Full-screen, no browser chrome, home screen icon.
Works identically on iPad and iPhone.

---

## Reduced Motion (All Breakpoints)

All animations respect prefers-reduced-motion:
- Sheet/panel slide animations: skip, show final state immediately
- Stat card pulse animations: stop, show static state
- Density bar width animation: skip, show final width immediately
- Toggle transitions: skip
- Already handled in globals.css — do not override in components

---

## What Cursor Must Not Do (Responsive + PWA)

- Use a bottom tab bar — hamburger `< lg`, sidebar on `lg+`
- Use bottom-sheet motion on staff overlays — employee panels are Untitled right slideouts (`slide-in-from-right` only)
- Hardcode venue name or app name in manifest files
  Both manifests are dynamic routes reading from tenant config
- Make the staff app portrait-only — staff need landscape on iPad
- Make the customer app landscape — it's portrait-only
- Create a single manifest for both apps
  Two separate manifests required for two separate installable apps
- Use different breakpoints than Untitled `lg` (1024px) for staff chrome
- Remove touch target minimums on desktop — 44px still applies
- Render a second in-page settings **sidebar** on desktop
  Section switching is horizontal tabs (Figma), not a second sidebar
- Expand Settings children in the NavRail
- Build the desktop settings as a stack of pages with a back chevron
