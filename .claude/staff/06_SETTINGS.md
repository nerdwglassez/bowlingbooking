# staff/06_SETTINGS.md
# Section 6 — Admin settings tab and all /admin/* sub-pages
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md (Tenant, Package, promo — Part 1 + Part 2)
# Code contract: contracts/ADMIN.md
# Visual: FIGMA.md employee frame table.
#          Section switcher https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=120-12428
#          Profile desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-3465
#          Profile mobile  https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-8694
#          Venue desktop   https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-7420
#          Hours desktop   https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=115-6744
#          Other settings interiors TBD. Historical HTML under docs/wireframes/ is not visual SoT.
# Colors: Untitled semantic utilities (theme.css). Do not introduce --staff-* tokens.
# Build status:  Partial — canonical routes under `/staff/settings/*` (Connect OAuth open)

| Route | Status |
|-------|--------|
| `/staff/settings` | Redirects to `/staff/settings/profile` |
| `/staff/settings/venue` | Built (ADMIN). Figma interior ready — FIGMA.md Venue desktop |
| `/staff/settings/hours` | Built (lane sync + bowlers/lane). Figma interior ready — FIGMA.md Hours desktop |
| `/staff/settings/pricing` | Built (PricingPeriod CRUD) |
| `/staff/settings/policies` | Built (wireframe policy rows) |
| `/staff/settings/packages` | Built (Public / Code-gated tabs) |
| `/staff/settings/team` | Built (ADMIN invite + detail sheets) |
| `/staff/settings/integrations` | Built (add / connect panel, enable toggle, view details + remove; Stripe OAuth return) |
| `/staff/settings/profile` | Built |
| Legacy `/admin/packages`, `/admin/promos` | Redirect to settings packages |

---

## CRITICAL: Settings Is Tab 5, Not a Separate App

Settings shares the same AppShell as Overview, Scheduling, Reporting, and Contacts.
The rail Settings item stays a single footer link — section switcher is in-page:

  Desktop (`lg+`): Untitled underline tabs (`type="underline"` `size="sm"`)
  under the "Settings" heading — Figma
  https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=120-12428
  Same AppShell padding as other staff pages (16px / 32px); no back links;
  footer CTAs `w-full lg:w-auto`. Omit ⌘K / search from that frame.
  label + description left / controls right with a divider per section.
  Below `lg`: stack label above fields. Select for section switcher (`max-width: 1023px`).
  AppShell: hamburger `< lg`, 280px sidebar on `lg+` (no bottom tabs).
  All sub-pages live under app/staff/settings/[section]/page.tsx
  `/staff/settings` redirects to `/staff/settings/profile`

Never build settings as a separate layout or portal.

---

## Settings section switcher

Tab / Select order (role-filtered; hide items the role cannot access):

Profile → Venue info → Operating hours → Pricing → Packages →
Booking policies → Team → Integrations

**Group: Venue** (Admin only except hours)
- Venue info — ADMIN
- Operating hours — all roles (STAFF view only)
- Pricing — ADMIN + MANAGER

**Group: Booking**
- Packages — all roles (STAFF view only)
- Booking policies — ADMIN + MANAGER

**Group: Team** (Admin + Manager)
- Team

**Group: Integrations** (Admin only)
- Integrations

**Account**
- Profile — all roles (first tab)
- Sign out — desktop: AppShell footer; mobile: last Select option
  Confirmation sheet "Sign out of {venue}?" · "Sign out" + "Cancel"

### Role-Based Visibility
Items not available to a role are hidden entirely — not disabled.

Staff role sees:
  Profile, Operating hours (view only), Packages (view only), Sign out (mobile Select)
  (No Venue info, Pricing, policies, Team, Integrations)

Manager role sees:
  Profile, Operating hours, Pricing, Packages, Booking policies, Team, Sign out
  (No Venue info, Integrations)

Admin sees everything.

### View-Only Items (Staff role)
- Items Staff can view but not edit show at 60% opacity
- Sub-label changes to "View only"
- Still tappable — opens read-only version of the page
- Save button hidden in read-only view

---

## Venue Info Sub-page (/staff/settings/venue)

Admin only. Manager and Staff: hidden from settings list.

Visual SoT: Figma Settings/Venue (Desktop) in FIGMA.md. Reuse the layout
section switcher. Restyle to label-left / field-right rows + Cancel/Save
like Profile. Omit Country (no Tenant column). Do not copy Untitled ⌘K /
dashboard chrome.

### Page Title Area
- Title: "Venue info" (--font-display, 22px)
- Sub-title: "Shown to customers in the booking app, emails, and confirmations."
  (12px, text-tertiary)

### Form Sections

**Identity:**
- Venue name field (text input)
  Note: "Appears in the app header and all customer emails."

**Address:**
- Street address (full width) with autosuggest
  Typing 3+ characters shows US address suggestions. Selecting one fills
  street + city + state + ZIP. Optional `GOOGLE_PLACES_API_KEY` for Google
  Places; otherwise Photon (OpenStreetMap) via `/api/address/autocomplete`
  (ADMIN-only).
- City + State (two-column row)
- ZIP code
  Note: "Address links to maps in the customer app and confirmation emails."

**Contact:**
- Phone number (tel input)
  Note: "Shown as a tappable call link to customers."
- Contact email (email input)
  Note: "Reply-to address for all booking confirmation emails."

### Form Field Styling
- Label: 10px uppercase, text-tertiary, 5px bottom margin
- Input: bg-primary bg, border 1.5px border-primary, --radius-md
- Padding: 11px 13px, font 13px, text-primary
- Filled state: border border-primary (no color change — always styled)
- Focus: border bg-brand-solid / text-brand-secondary, subtle glow
- Note text below field: 10px, text-tertiary, 4px top margin

### Save Button
- Full width, bg-brand-solid / text-brand-secondary bg, white text, 13px 600 weight
- Label: "Save venue info"
- Disabled until any field changes
- Dynamic label: "Save venue info" → "Saving…" → "Saved" (auto-revert 2s)
- On save: toast "Venue info updated"

---

## Operating Hours Sub-page (/staff/settings/hours)

Admin and Manager can edit. Staff: view only.

Visual SoT: Figma Settings/Operating Hours (Desktop) in FIGMA.md. Reuse the
layout section switcher. Restyle weekly day checkboxes + From/To, lane
configuration, and booking duration to the split-row pattern. The frame’s
City/State/Zip under Lane Configuration is a Venue copy — do not add address
fields here. Cancel + Save. Do not copy Untitled ⌘K / dashboard chrome.

### Page Title Area
- Title: "Operating hours"
- Sub-title: explains impact on customer booking availability

### Hours Table
One row per day of the week (Sun → Sat).

**Row layout:**
```
[Day label] [Open time] [–] [Close time] [Open/Closed toggle]
```

- Day label: 3-letter abbreviation, 13px, 500 weight, text-primary, min-width 36px
- Time inputs: styled time fields, bg-primary bg, --radius-md
  Format: 24h internally, displayed as 12h
- Separator: "–" between times, text-tertiary
- Toggle: small inline toggle (not the full iOS-style)
  Open state: --palette-green-500 (green)
  Closed state: --palette-stone-700 (muted)
  Label: "Open" or "Closed" beside toggle, 11px

**Closed day state:**
- Time inputs: disabled, pointer-events none, 40% opacity
- "Closed" label: --status-error-text-dark color (red tint)
- Day label: text-tertiary at 60% opacity

### Copy Hours Helper
- Appears between the hours table and lane config divider
- Row: descriptive text + "Apply" button
- Text: "Apply Mon–Thu hours to all weekdays" (11px, text-tertiary)
- Button: "Apply" — bg-brand-solid / text-brand-secondary text, no border, text button
- Reduces repetitive input for days with identical hours

### Lane Configuration (on same page)
Below divider — lives on Operating Hours page because it's
operationally related to when lanes are available.

**Total lanes:**
- Row: label + sub + stepper
- Label: "Total lanes" (13px, 500 weight)
- Sub: "Physical lanes available" (10px, text-tertiary)
- Stepper: [−] [value] [+]
  Buttons: 28×28px, --radius-sm, bg-secondary
  Value: --font-display, 17px, min-width 24px centered

**Max bowlers per lane:**
- Same row layout and stepper style
- Sub: "Drives lane assignment calculation"
- Default: 6

**Booking duration range:**
- Two dropdowns side by side: "Min duration" + "Max duration"
- Options: 30 min, 1 hr, 1.5 hr, 2 hr, etc.
- Dropdown: bg-primary bg, --radius-md, custom chevron

### Save Button
- Label: "Save hours"
- Same dynamic behavior as venue info save

---

## Pricing Sub-page (/staff/settings/pricing)

Admin only. Pricing moved under Venue group (not standalone).

### Pricing Strategy
Section label: "Pricing strategy"

**Strategy dropdown (compact):**
- Full width select styled as bg-primary bg, --radius-md
- Options:
  "Per person · per hour"
  "Per lane · per hour"
  "Per person · per game"
  "Fixed packages only"

**Strategy explainer (below dropdown):**
- Background: rgba(245,158,11,0.06), border rgba(245,158,11,0.15), --radius-md
- Formula line: monospace, 12px, --status-warning-text-dark
  e.g. "price = bowlers × hours × rate"
- Example line: 11px, text-tertiary
  e.g. "6 bowlers · 2 hrs at $8.50 → $102.00"
  Calculated amount: bg-brand-solid / text-brand-secondary color
- Updates when strategy changes

### Default Rate
- $ symbol + number input + unit label ("per person · per hour")
- Row layout: left-aligned, inline
- Number input: large, prominent, 14px, 600 weight
- Step: 0.50

### Shoe Rental
- Row: label + sub + $ input
- Label: "Rental price" (13px)
- Sub: "Per person · charged separately from lane rate" (10px, text-tertiary)
- Input: compact, right-aligned

### Rate Overrides (Priority-based)
Section label: "Rate overrides"
Description: "Override periods replace the default rate. Higher priority periods win when dates overlap." (11px, text-tertiary)

**Override period row:**
- Color dot (8px circle, distinct color per period)
- Period name: 13px, 600 weight, text-primary
- Priority badge: Untitled Badge `size="sm" type="modern"`
  (Only Admin sees priority ordering — Managers see periods without reordering)
- Period detail: 11px, text-tertiary "Fri–Sun · 5:00 PM – close"
- Rate: --font-display, 14px, bg-brand-solid / text-brand-secondary, right side
- Chevron: › right, text-tertiary
- Tap: opens period edit sheet

**Add rate override button:**
- Dashed border style (1.5px dashed border-primary)
- + icon + "Add rate override" label
- text-tertiary color
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
- Active tab: bg-brand-solid / text-brand-secondary border-bottom 2px, bg-brand-solid / text-brand-secondary text
- Inactive: text-tertiary

**Package card:**
- bg-primary bg, --radius-lg, 1px border-secondary
- Code-gated packages: purple-tint border rgba(168,85,247,0.2)
- Top row: package name (13px, 600 weight) + status dot (6px circle)
  Active: --palette-green-500
  Inactive: border-primary
- Description: 12px, text-tertiary, line-height 1.5
- Tags row: inclusion tags (included/type/etc), --radius-full, small
- Bottom row: price (--font-display, 17px, bg-brand-solid / text-brand-secondary) + "Edit" text button

**Add package button:**
- Dashed border, full width (minus 32px), --radius-lg
- + icon + "Add package" label
- text-tertiary

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
- Label: 13px, 500 weight, text-primary
- Sub: 11px, text-tertiary, line-height 1.5
- Control: toggle, select, or stepper (right side)
- Note (optional): 10px, text-tertiary below the row
- Impact badges (optional): small rounded tags
  Customer-visible: amber tint
  Operations: blue tint

### Save Button
- Label: "Save policies"
- Full width, bg-brand-solid / text-brand-secondary bg
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
- bg-brand-solid / text-brand-secondary bg, white text
- + icon + "Invite team member"
- Tap: invite slideout from the right

### Staff Table

**Table headers:**
- Three columns: Name · Role · Status
- `text-sm font-medium text-secondary`

**Staff row:**
- Name column: name (13px, 500 weight) + meta below (10px, text-tertiary)
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
  Inactive: border-primary

**Tapping a staff row:**
- Employee detail slideout from the right
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
- "Send invite" button: bg-brand-solid / text-brand-secondary bg
- Invited users appear in table with Pending status

---

## Integrations Sub-page (/staff/settings/integrations)

Admin only.

### Row states

**Not connected**
- Status badge: "Required" (Stripe) or omitted for optional apps
- Primary control: **Add integration** — opens the right panel in connect mode

**Connected**
- Status badge: "Connected"
- **View details** link opens the right panel in manage mode
- **Enable toggle** turns the integration on/off without deleting the connection

### Connect panel
- Explains the integration and lists permissions the venue will grant
- Stripe: **Connect with Stripe** redirects to Stripe Connect onboarding; return/refresh URLs land back on `/staff/settings/integrations?stripe=return|refresh`
- Resend / Make: confirm permissions in-app, then soft-connect via tenant `config.integrations`
- Cancel closes the panel without changes

### Manage panel
- Enable toggle (same as row)
- Permissions granted summary
- **Remove integration** with confirm — clears Stripe Connect account id and/or config prefs

### Categories
- Payments: Stripe (required)
- Email: Resend (optional; needs `RESEND_API_KEY` on the server)
- Automation: Make (optional)

---

## Profile Sub-page (/staff/settings/profile)

All roles can access. Visual SoT: Figma Profile desktop + mobile URLs in FIGMA.md.

Keep Royal Z AppShell (Untitled sidebar + hamburger `< lg`). Omit photo, country, timezone, and notification toggles
(no schema). Role is read-only — never posted. Do not copy Untitled logo, ⌘K, or dummy accounts.

### Fields
- Personal info heading + “Update your photo and personal details here.”
- First name + last name (required; two-column on desktop, stacked on mobile)
  Persist as `User.name` (join on save, split on load — first token vs remainder)
- Email address (required, mail icon)
  Note: changing email updates the sign-in address
- Role (read-only display)
- Current password (required to change email or password)
- New password (optional). Minimum 8 characters — do not adopt Figma’s 12-char rule.
  No confirm-password field.

### Footer
- Cancel (resets dirty fields) + Save
- Current password required when email or password changes

---

## Global Settings Sub-page Patterns

### Navigation
- Page title is always “Settings”
- Desktop (`lg+`): Untitled horizontal tabs (`type="underline"` `size="sm"`)
  — Figma https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=120-12428
- Mobile: Untitled Select for the current section; Sign out is the last option
- No back chevron “‹ Settings” — the switcher replaces it
- AppShell NavRail (hamburger `< lg`, 280px sidebar on `lg+`) stays for primary staff nav
- Unsaved changes on tab/select: “Save” + “Discard” + “Keep editing”

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

Desktop settings section nav is **in-page tabs**, not expanded NavRail children.

- NavRail “Settings” stays a single item (active for all `/staff/settings/*`)
- Horizontal tabs under the Settings heading switch sections (Figma order, role-filtered)
- `/staff/settings` redirects to `/staff/settings/profile`
- No back chevron — the rail is always visible
- Unsaved-changes guard wraps AppShell so tab, Select, and rail links are intercepted when a form is dirty

---

## What Cursor Must Not Do (Settings)

- Build settings as a separate app or layout from the cockpit
  Settings is a primary AppShell item — same layout, same header
- Show items that aren't accessible to the current role
  Hidden entirely, not disabled or grayed
- Expand Settings children in the NavRail (tabs own that)
- Copy Untitled dummy chrome (logo, ⌘K search, placeholder accounts)
- Put save buttons in the staff header (not a toolbar pattern)
  Save buttons live at the bottom of the form content
- Send per-field API calls on every input change
  Collect all changes, single save on button tap
- Show the Stripe Connect button in the platform's purple
  Stripe button uses Stripe's own brand color (#6772E5)
  This is intentional brand recognition, not a token violation
