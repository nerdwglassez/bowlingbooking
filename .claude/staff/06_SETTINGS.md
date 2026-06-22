# staff/06_SETTINGS.md
# Section 6 — Admin settings tab and all /admin/* sub-pages
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md (Tenant, Package, promo — Part 1 + Part 2)
# Code contract: contracts/ADMIN.md
# Wireframes:    docs/wireframes/admin/settings-venue-details.html,
#                docs/wireframes/admin/settings-booking-policies.html,
#                docs/wireframes/admin/settings-packages-unified.html,
#                docs/wireframes/admin/settings-integrations.html,
#                docs/wireframes/admin/admin-settings-refined.html
# Build status:  Partial — canonical routes under `/staff/settings/*` (Connect OAuth open)

| Route | Status |
|-------|--------|
| `/staff/settings` hub | Built |
| `/staff/settings/venue` | Built (ADMIN) |
| `/staff/settings/hours` | Built (lane sync + bowlers/lane) |
| `/staff/settings/pricing` | Built (PricingPeriod CRUD) |
| `/staff/settings/policies` | Built (wireframe policy rows) |
| `/staff/settings/packages` | Built (Public / Code-gated tabs) |
| `/staff/settings/team` | Built (ADMIN invite + detail sheets) |
| `/staff/settings/integrations` | Partial (status cards + Stripe Dashboard link; OAuth open) |
| `/staff/settings/profile` | Built |
| Legacy `/admin/packages`, `/admin/promos` | Redirect to settings packages |

---

## CRITICAL: Settings Is Tab 5, Not a Separate App

Settings shares the same layout, header, and tab bar as
Cockpit, Schedule, Reports, and Team.

Settings sub-pages use standard back-chevron navigation:
  Staff header shows: "‹ Settings" on the left + page title centered
  Tab bar remains visible on all settings sub-pages
  All sub-pages live under app/staff/settings/[section]/page.tsx

Never build settings as a separate layout or portal.

---

## Settings Root Page (/staff/settings)

### Page Structure
```
Staff header (persistent — venue name + role badge)
Page title "Settings"
Grouped settings list
Tab bar (persistent)
```

### Settings Groups and Items

**Group: Venue** (Admin only)
- Venue info → "Name, address, contact details"
- Operating hours → "Open · close · lanes"
- Pricing → "Strategy · rates · overrides"

**Group: Booking** (Admin + Manager)
- Packages → "X public · X code-gated"
- Booking policies → "Hold time · cancellation window"

**Group: Team** (Admin only)
- Team → "X staff members"

**Group: Integrations** (Admin only)
- Integrations → status summary e.g. "Stripe connected · Make error"
  Status shown inline on the root item — no tapping required
  to see connection health at a glance

**Group: Account** (all roles)
- My profile → "Name · email · password"
- Sign out → red tint treatment (see below)

### Settings Item Anatomy
Each item:
- Icon container: 32×32px, --radius-md, --staff-card-raised bg, 16px SVG icon
- Label: 13px, 500 weight, --staff-text-primary
- Sub-label: 11px, --staff-text-muted, margin-top 1px
- Chevron: › right side, --staff-text-muted, 12px
- Background: --staff-card, --radius-md, 1px --staff-border
- Padding: 12px 14px
- Tap: navigates to sub-page

### Sign Out Item
- Border: rgba(239,68,68,0.15)
- Icon container: rgba(239,68,68,0.08) bg
- Icon: door/exit SVG, #F87171 stroke
- Label: "Sign out" in #FCA5A5
- No sub-label, no chevron
- Tap: confirmation sheet "Sign out of Royal Z Staff?" · "Sign out" + "Cancel"

### Role-Based Visibility
Items not available to a role are hidden entirely — not disabled.

Staff role sees:
  Account: My profile, Sign out only
  Venue: Operating hours (view only, see below)
  Booking: Packages (view only)
  "Need more access? Contact your venue admin." note at bottom

Manager role sees:
  Venue: Operating hours (edit), Pricing (edit)
  Booking: Packages (edit), Booking policies (edit)
  Account: My profile, Sign out
  (No Team, no Integrations)

Admin sees everything.

### View-Only Items (Staff role)
- Items Staff can view but not edit show at 60% opacity
- Sub-label changes to "View only"
- Still tappable — opens read-only version of the page
- Save button hidden in read-only view

---

## Venue Info Sub-page (/staff/settings/venue)

Admin only. Manager and Staff: hidden from settings list.

### Page Title Area
- Title: "Venue info" (--font-display, 22px)
- Sub-title: "Shown to customers in the booking app, emails, and confirmations."
  (12px, --staff-text-muted)

### Form Sections

**Identity:**
- Venue name field (text input)
  Note: "Appears in the app header and all customer emails."

**Address:**
- Street address (full width)
- City + State (two-column row)
- ZIP code
  Note: "Address links to maps in the customer app and confirmation emails."

**Contact:**
- Phone number (tel input)
  Note: "Shown as a tappable call link to customers."
- Contact email (email input)
  Note: "Reply-to address for all booking confirmation emails."

### Form Field Styling
- Label: 10px uppercase, --staff-text-muted, 5px bottom margin
- Input: --staff-card bg, border 1.5px --staff-border-strong, --radius-md
- Padding: 11px 13px, font 13px, --staff-text-primary
- Filled state: border --staff-border-strong (no color change — always styled)
- Focus: border --staff-action, subtle glow
- Note text below field: 10px, --staff-text-muted, 4px top margin

### Save Button
- Full width, --staff-action bg, white text, 13px 600 weight
- Label: "Save venue info"
- Disabled until any field changes
- Dynamic label: "Save venue info" → "Saving…" → "Saved" (auto-revert 2s)
- On save: toast "Venue info updated"

---

## Operating Hours Sub-page (/staff/settings/hours)

Admin and Manager can edit. Staff: view only.

### Page Title Area
- Title: "Operating hours"
- Sub-title: explains impact on customer booking availability

### Hours Table
One row per day of the week (Sun → Sat).

**Row layout:**
```
[Day label] [Open time] [–] [Close time] [Open/Closed toggle]
```

- Day label: 3-letter abbreviation, 13px, 500 weight, --staff-text-primary, min-width 36px
- Time inputs: styled time fields, --staff-card bg, --radius-md
  Format: 24h internally, displayed as 12h
- Separator: "–" between times, --staff-text-muted
- Toggle: small inline toggle (not the full iOS-style)
  Open state: --palette-green-500 (green)
  Closed state: --palette-stone-700 (muted)
  Label: "Open" or "Closed" beside toggle, 11px

**Closed day state:**
- Time inputs: disabled, pointer-events none, 40% opacity
- "Closed" label: --status-error-text-dark color (red tint)
- Day label: --staff-text-muted at 60% opacity

### Copy Hours Helper
- Appears between the hours table and lane config divider
- Row: descriptive text + "Apply" button
- Text: "Apply Mon–Thu hours to all weekdays" (11px, --staff-text-muted)
- Button: "Apply" — --staff-action text, no border, text button
- Reduces repetitive input for days with identical hours

### Lane Configuration (on same page)
Below divider — lives on Operating Hours page because it's
operationally related to when lanes are available.

**Total lanes:**
- Row: label + sub + stepper
- Label: "Total lanes" (13px, 500 weight)
- Sub: "Physical lanes available" (10px, --staff-text-muted)
- Stepper: [−] [value] [+]
  Buttons: 28×28px, --radius-sm, --staff-card-raised
  Value: --font-display, 17px, min-width 24px centered

**Max bowlers per lane:**
- Same row layout and stepper style
- Sub: "Drives lane assignment calculation"
- Default: 6

**Booking duration range:**
- Two dropdowns side by side: "Min duration" + "Max duration"
- Options: 30 min, 1 hr, 1.5 hr, 2 hr, etc.
- Dropdown: --staff-card bg, --radius-md, custom chevron

### Save Button
- Label: "Save hours"
- Same dynamic behavior as venue info save

---

## Pricing Sub-page (/staff/settings/pricing)

Admin only. Pricing moved under Venue group (not standalone).

### Pricing Strategy
Section label: "Pricing strategy"

**Strategy dropdown (compact):**
- Full width select styled as --staff-card bg, --radius-md
- Options:
  "Per person · per hour"
  "Per lane · per hour"
  "Per person · per game"
  "Fixed packages only"

**Strategy explainer (below dropdown):**
- Background: rgba(245,158,11,0.06), border rgba(245,158,11,0.15), --radius-md
- Formula line: monospace, 12px, --status-warning-text-dark
  e.g. "price = bowlers × hours × rate"
- Example line: 11px, --staff-text-muted
  e.g. "6 bowlers · 2 hrs at $8.50 → $102.00"
  Calculated amount: --staff-action color
- Updates when strategy changes

### Default Rate
- $ symbol + number input + unit label ("per person · per hour")
- Row layout: left-aligned, inline
- Number input: large, prominent, 14px, 600 weight
- Step: 0.50

### Shoe Rental
- Row: label + sub + $ input
- Label: "Rental price" (13px)
- Sub: "Per person · charged separately from lane rate" (10px, --staff-text-muted)
- Input: compact, right-aligned

### Rate Overrides (Priority-based)
Section label: "Rate overrides"
Description: "Override periods replace the default rate. Higher priority periods win when dates overlap." (11px, --staff-text-muted)

**Override period row:**
- Color dot (8px circle, distinct color per period)
- Period name: 13px, 600 weight, --staff-text-primary
- Priority badge: "Priority N" — 9px, --staff-card-raised bg, small padding
  (Only Admin sees priority ordering — Managers see periods without reordering)
- Period detail: 11px, --staff-text-muted "Fri–Sun · 5:00 PM – close"
- Rate: --font-display, 14px, --staff-action, right side
- Chevron: › right, --staff-text-muted
- Tap: opens period edit sheet

**Add rate override button:**
- Dashed border style (1.5px dashed --staff-border-strong)
- + icon + "Add rate override" label
- --staff-text-muted color
- Tap: opens period creation sheet

**Period creation/edit sheet:**
- Bottom sheet
- Fields: Name, Days (chip multi-select), Start time, End time, Rate
- Save / Delete (edit only) buttons
- Delete: red tint, confirmation required

### Save Button
- Label: "Save pricing"
- Same dynamic save behavior

---

## Packages Sub-page (/staff/settings/packages)

Admin and Manager can edit. Staff: view only.

The unified package model means promo codes no longer exist as
a separate entity — everything is a Package with an access type.

### Package List

**Access type filter tabs:**
- Two tabs: "Public" | "Code-gated"
- Active tab: --staff-action border-bottom 2px, --staff-action text
- Inactive: --staff-text-muted

**Package card:**
- --staff-card bg, --radius-lg, 1px --staff-border
- Code-gated packages: purple-tint border rgba(168,85,247,0.2)
- Top row: package name (13px, 600 weight) + status dot (6px circle)
  Active: --palette-green-500
  Inactive: --staff-border-strong
- Description: 12px, --staff-text-muted, line-height 1.5
- Tags row: inclusion tags (included/type/etc), --radius-full, small
- Bottom row: price (--font-display, 17px, --staff-action) + "Edit" text button

**Add package button:**
- Dashed border, full width (minus 32px), --radius-lg
- + icon + "Add package" label
- --staff-text-muted

**Package edit page:**
(Navigates to /staff/settings/packages/[id] or /new)
Standard form fields: name, description, pricing type, price/rate,
inclusions toggles (games, shoes, food, game credits),
availability days, access type toggle (Public/Code-gated),
code and limits (if Code-gated)

---

## Booking Policies Sub-page (/staff/settings/policies)

Admin and Manager can edit. All on one scrollable page — no sub-pages.

### Policy Groups

**Checkout:**
- Lane hold time (stepper, minutes, default 15)
- Minimum booking notice (select: None/30min/1hr/2hrs/24hrs)

**Self-serve changes:**
- Cancellation window (select: 6hr/24hr/48hr/72hr)
  Note: "Shown to customers as 'Free cancellation until [date]'"
  Badge: "Shown to customers" — amber tint
- Reschedule window (select, independent from cancellation)
- Check-in window (select: 30min–4hrs, configurable range)
  Note: "Customers can check in during this window before their reservation"

**Group limits:**
- Max bowlers online (stepper, default 18)
  Note: "Groups larger than this are prompted to call"
- Max online booking notice (select: how far ahead customers can book)

**Operations:**
- Late grace period (stepper, minutes, default 5)
  Badge: "Affects cockpit Late stat" — blue tint
- Allow walk-in bookings (toggle)
  Note: disabling hides walk-in FAB in cockpit
- Require account to modify (toggle)

### Policy Row Anatomy
Each policy:
- Label: 13px, 500 weight, --staff-text-primary
- Sub: 11px, --staff-text-muted, line-height 1.5
- Control: toggle, select, or stepper (right side)
- Note (optional): 10px, --staff-text-muted below the row
- Impact badges (optional): small rounded tags
  Customer-visible: amber tint
  Operations: blue tint

### Save Button
- Label: "Save policies"
- Full width, --staff-action bg
- Single save for all policies (not per-row)

---

## Team Sub-page (/staff/settings/team)

Admin only (Manager and Staff cannot see Team in settings list).

### Page Header
- Back: "‹ Settings"
- Title: "Team" (centered)
- Role badge: Admin

### Invite Button
- Full width, below header
- --staff-action bg, white text
- + icon + "Invite team member"
- Tap: invite sheet slides up

### Staff Table

**Table headers:**
- Three columns: Name · Role · Status
- 9px uppercase, --staff-text-muted

**Staff row:**
- Name column: name (13px, 500 weight) + meta below (10px, --staff-text-muted)
  Owner row: "Owner · You" as meta
  Pending invite: "Invited [date ago]" as meta
- Role column: role badge
  Admin: amber tint bg, amber text
  Manager: blue tint bg, blue text
  Staff: purple tint bg, purple text
  Pending: stone tint bg, muted text
- Status column: 8px dot, centered
  Active: --palette-green-500, pulsing on hover
  Pending: --palette-amber-500, pulsing
  Inactive: --staff-border-strong

**Tapping a staff row:**
- Employee detail sheet slides up
- Background dims to 18%

### Employee Detail Sheet

**Sheet header:**
- Avatar (36px circle, initials)
- Name (--font-display, 17px)
- Meta: "Role · Status · Last seen [relative time]"

**Editable fields:**
- Email (login): text input
  Note: "Changing this updates their sign-in email."
- Role: radio-style options

**Role options:**
- Admin: grayed out, "cannot assign" note (privilege escalation prevention)
- Manager: selectable
- Staff: selectable (shown as selected if current role)
- Each option: 14px radio circle + role name + description

**Danger zone:**
- "Remove from team" text in --status-error-text-dark
- Tap: confirmation "Remove [name] from the team?"
  "Remove" (red) + "Cancel"
  On remove: cannot undo, user loses access immediately

### Invite Sheet
- Email field: required
- Role selector: same radio options as employee edit
- Personal message field: optional
- "Send invite" button: --staff-action bg
- Invited users appear in table with Pending status

---

## Integrations Sub-page (/staff/settings/integrations)

Admin only.

### Integration Card

**Connected state:**
- Border: rgba(16,185,129,0.2) — green tint
- Status badge: "Connected" — --status-available-bg, --status-available-text
- Top row: logo + name + description + badge
- Connected details block (below top row):
  Background: rgba(16,185,129,0.06)
  Rows: label + value (e.g. "Account: Royal Z Lanes", "Mode: Live")
  All values in --status-ok-text-dark

**Not connected state:**
- Border: --staff-border (neutral)
- Status badge: "Required" (for Stripe) — --status-critical-bg, --status-critical-text
  OR: "Optional" — --staff-card-raised, --staff-text-muted

**Error state:**
- Border: rgba(248,113,113,0.3) — red tint
- Status badge: "Error" — --status-critical-bg, --status-critical-text

**Tapping an integration card:**
- Detail sheet slides up
- Background dims to 18%

### Stripe Detail Sheet

**Not connected:**
- Logo + "Stripe" title + "Required for online payments" sub
- Explanation: "Payments go directly to your account — platform never holds funds."
- Warning note: amber tint — "Online booking is disabled until Stripe is connected."
- "Connect with Stripe" button: Stripe purple (#6772E5) bg, white text
  Icon: credit card SVG
- Note: "You'll be redirected to Stripe to authorize the connection."
- Docs link: "Stripe Connect setup guide →" in blue

**Connected:**
- Connected details block (account name, mode, connected date)
- "Disconnect" text button: --status-error-text-dark
  Requires confirmation — disconnecting disables online booking

### Make Detail Sheet

**Error state:**
- Logo + "Make" title + error summary in red (e.g. "Webhook unreachable · last event failed 2h ago")
- Error detail card: red tint bg, error description
- Webhook URL field: editable, shows current URL
- "Test webhook" button: --staff-card-raised
- "Save webhook URL" button: --staff-action bg
- Docs link

**Connected:**
- Shows webhook URL (masked)
- Last event timestamp
- "Test" + "Disconnect" actions

### Integration Categories on Main Page
- Payments: Stripe (required)
- Automation: Make (optional)
- Email: configured separately (transactional email provider)

---

## My Profile Sub-page (/staff/settings/profile)

All roles can access.

### Fields
- First name + Last name (two-column row)
- Email address
  Note: "This is your sign-in email."
- Current password (required to save changes)
- New password (optional — only if changing)
- Confirm new password (shown when new password has content)

### Save
- Button: "Save profile"
- Requires current password to confirm any changes

---

## Global Settings Sub-page Patterns

### Navigation
- Mobile: settings sub-pages show a back chevron "‹ Settings" in header
- Desktop (`md+`): no back chevron — navigation lives in the NavRail
  (the "Settings" item expands to its child pages); back chevron is
  `md:hidden`
- Tab bar (mobile) / NavRail (desktop) persistent on all sub-pages
- No breadcrumbs — single level deep (Settings → Sub-page)

### Save / Discard Pattern
- Editing any field shows floating footer: "Save" + "Discard"
- OR: dedicated save button at bottom of page (most settings pages)
- Unsaved changes + back tap: "You have unsaved changes" confirmation
  "Save" + "Discard" + "Keep editing"
- Single save button at bottom — not per-field inline saves

### Dynamic Save Button Label
- Default: "Save [page name]"
- On tap: "Saving…" (spinner replaces label)
- On success: "Saved ✓" (2 seconds, then reverts to default)
- On error: button returns to default, error toast appears

### Toast on Save
- Success: "Settings saved" — green checkmark, 3s auto-dismiss
- Error: "Failed to save — try again" — red X, 5s, manual dismiss

---

## Desktop Settings Behavior

Desktop settings navigation lives in the **NavRail**, not in a second
in-page panel. There is exactly one navigation surface on every viewport.

- The NavRail "Settings" item expands inline while you are within
  `/staff/settings/*` to reveal the grouped child pages
  (Venue · Booking · Team · Integrations · Account)
- Active settings section highlighted in the rail with the amber
  `--color-action-dark` left border + amber text
- Collapses back to a single "Settings" link when you leave the section
- Sub-pages render in the main content area without a separate sidebar
- No back chevron on desktop — the rail is always visible (back chevron
  is mobile-only, hidden at `md+`)
- The settings hub page (`/staff/settings`) shows only a short prompt on
  desktop ("Choose a section…") — the grouped list is mobile-only
- Forms expand to use available width up to 640px max
- Unsaved-changes guard still applies to rail navigation: the guard
  provider wraps the AppShell so NavRail links are intercepted when a
  form is dirty

---

## What Cursor Must Not Do (Settings)

- Build settings as a separate app or layout from the cockpit
  Settings is Tab 5 — same layout, same header, same tab bar
- Show items that aren't accessible to the current role
  Hidden entirely, not disabled or grayed
- Navigate to a new layout for any settings sub-page
  Standard staff layout + back chevron (mobile) / NavRail (desktop)
- Render a second in-page settings nav sidebar on desktop
  Navigation lives in the NavRail — the "Settings" item expands to its
  child pages. A separate in-page sidebar is double navigation.
- Put save buttons in the staff header (not a toolbar pattern)
  Save buttons live at the bottom of the form content
- Send per-field API calls on every input change
  Collect all changes, single save on button tap
- Show the Stripe Connect button in the platform's purple
  Stripe button uses Stripe's own brand color (#6772E5)
  This is intentional brand recognition, not a token violation
- Remove the tab bar from settings sub-pages
