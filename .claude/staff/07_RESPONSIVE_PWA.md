# staff/07_RESPONSIVE_PWA.md
# Section 7 — Desktop responsive layout and PWA manifests
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       DESIGN_SYSTEM.md (breakpoints, tokens)
# Code contract: contracts/STAFF.md (NavRail breakpoints)
# Wireframes:    docs/wireframes/admin/admin-pricing-team-pwa.html
# Build status:  Reference — NavRail responsive behavior is built; PWA TBD

---

## Breakpoints

```
Mobile:   < 640px    — phone, single column, bottom tab bar
Tablet:   640–1024px — iPad, primary staff device, bottom tab bar
Desktop:  > 1024px   — laptop/desktop, left sidebar nav
```

The staff app is **tablet-first**, not desktop-first.
Most front desk and floor staff use an iPad or iPhone.
Desktop is a secondary surface used by managers and admins
for settings, reports, and scheduling.

All touch targets remain 44px minimum regardless of breakpoint.

---

## Navigation: Mobile + Tablet vs Desktop

### Mobile + Tablet (< 1024px)
- Bottom tab bar always visible
- 5 tabs: Cockpit · Schedule · Reports · Team · Settings
- Tab bar: --staff-nav bg, border-top rgba(168,85,247,0.12)
- Active indicator: 20×2px amber bar at TOP of tab item
- Role-based tabs hidden entirely (not disabled)

### Desktop (> 1024px)
- Left sidebar replaces bottom tab bar
- Sidebar width: 220px, fixed
- Background: --staff-nav
- Border right: 1px rgba(168,85,247,0.12)
- Top: venue name (--font-display, 18px, #FAFAF9) + role badge
- Nav items: icon (24px SVG) + label (13px)
  Active: 2px --staff-action left border + --staff-action text + full opacity icon
  Inactive: --staff-text-muted text + 35% opacity icon
- Content area fills remaining width (calc(100% - 220px))
- No bottom tab bar on desktop

---

## Staff Header: Desktop Adaptations

### Mobile + Tablet
- Full-width header
- Left: venue name + date/time
- Right: role badge + avatar
- Height: 56px

### Desktop
- Header spans content area only (sidebar has its own top section)
- Left: page title (changes per section, not venue name)
- Right: role badge + avatar + optional action button
- Venue name lives in sidebar top, not repeated in header
- Height: 64px

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
- Booking detail: RIGHT PANEL (400px) instead of bottom sheet
  Slides in from right: translateX(100%)→0
  Backdrop: --surface-dark 20% opacity
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
- Walk-in booking opens as right panel (400px), not bottom sheet
- Same 3-step flow, panel layout instead of sheet layout

---

## Booking Detail: Desktop

Always a right panel on desktop.
Never a bottom sheet at > 1024px.

- Width: 400px fixed
- Height: 100vh
- Background: --staff-card
- Left border: 1px --staff-border
- Animation: translateX(100%)→0, --duration-base --ease-out
- Backdrop: --surface-dark 20% opacity, covers content area only
  (not the sidebar)
- Dismiss: tap backdrop, Escape key, or X button in panel header

### Check-in Checklist (desktop)
- Panel content replaces in place
- Same checklist items and behavior as mobile
- Confirm button at bottom of panel (sticky)

---

## Booking Modification: Desktop

- All states render within the right panel
- Field editor slides up within the panel content area
- Panel content dims to 18% when field editor is active
- No full-screen overlays on desktop

---

## Walk-in Flow: Desktop

- Right panel (400px), not bottom sheet
- 3-step flow within panel
- Step indicator in panel header (same dot pattern)
- Cockpit content visible behind panel (no dimming on desktop)
- All other behavior identical to mobile

---

## Schedule Tab: Desktop

- Calendar: centered, max-width 480px (not stretched)
- Day detail: renders to the RIGHT of the calendar as a column
  Side-by-side layout instead of below
  Day detail column: ~40% of content area
- Block creation: right panel (400px), not bottom sheet
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

## Settings Tab: Desktop

Single navigation surface — settings nav lives in the **NavRail**, not a
second in-page panel. (Avoids the double-navigation that a separate
in-page sidebar creates next to the rail.)

- The NavRail "Settings" item expands inline while within
  `/staff/settings/*` to reveal grouped child pages
  Groups: Venue · Booking · Team · Integrations · Account
  Active child: amber left border (--color-action-dark) + amber text
  Background: --surface-card (the rail's own surface)
- Collapses to a single "Settings" link when you leave the section
- Content: settings sub-page fills the main content area
  Max content width: 640px
  No back chevron on desktop — the rail is always visible
- The settings hub page shows only a short prompt on desktop; the
  grouped drill-down list is mobile-only

Sub-pages render in the main content area. Navigation is always one click
from the rail. The unsaved-changes guard wraps the AppShell, so rail
navigation is intercepted when a form is dirty.

---

## Sheet → Panel Conversion Rules

All bottom sheets on mobile become right panels (400px) on desktop:

| Mobile (< 1024px) | Desktop (> 1024px) |
|---|---|
| Booking detail sheet | Right panel |
| Check-in checklist | Within booking detail panel |
| Field editor sheet | Within modification panel |
| Cancel sheet | Within booking detail panel |
| Walk-in sheet | Right panel |
| Block creation sheet | Right panel |
| Employee detail sheet | Right panel |
| Integration detail sheet | Right panel |
| Package detail sheet (booking flow) | Right panel from right |

Exceptions — these are always sheets on both mobile and desktop:
- Cancel confirmation (simple yes/no, too small for a panel)
- Sign out confirmation
- Simple toasts (never sheets)

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

- Use the bottom tab bar on desktop — replace with left sidebar at >1024px
- Show bottom sheets on desktop — all sheets become right panels
- Hardcode venue name or app name in manifest files
  Both manifests are dynamic routes reading from tenant config
- Make the staff app portrait-only — staff need landscape on iPad
- Make the customer app landscape — it's portrait-only
- Create a single manifest for both apps
  Two separate manifests required for two separate installable apps
- Use different breakpoints than 640px and 1024px
- Remove touch target minimums on desktop — 44px still applies
- Render a second in-page settings nav sidebar on desktop
  Settings navigation lives in the NavRail (the "Settings" item expands
  to its child pages) — a separate in-page sidebar is double navigation
- Build the desktop settings as a stack of pages
  Desktop navigates via the rail, not a back-and-forth page stack
