# Step 1 Booking Flow — Detailed Visual Descriptions

Source: Figma **Royal Z Various** (Booking Portal Refinements).  
Extracted from MCP data; no PNG exports. Use these as implementation specs.

---

## Design tokens (shared across Step 1)

**Colors**
- **Background (page):** `#FFFFFF`
- **Background (content area):** `#F9FAFB`
- **Primary text / heading:** `#1A237E`
- **Secondary text / body:** `#717182`
- **Section headings (e.g. “Select a date”):** `#0F172A`
- **Muted / disabled:** `#64748B`, `#94A3B8`
- **Border default:** `#E2E8F0`
- **Calendar disabled day bg:** `#E9EBEF`
- **Selected day text:** `#FFFFFF` on gradient
- **Day numbers (default):** `#0A0A0A`
- **Primary CTA text (e.g. Login, Continue):** `#6366F1` or white on gradient
- **Time-slot available (green):** `#10B981`
- **Time-slot limited (amber):** `#F59E0B`
- **Card border:** `#E2E8F0` 1px
- **Nav bar (mobile):** `rgba(255,255,255,0.8)`, stroke `#CAD8EC`

**Gradients**
- **Progress dot active / selected day / primary CTA:**  
  `linear-gradient(166deg, #6366F1 0%, #3B82F6 100%)` or 135° / 180° variants
- **Icon background (calendar):**  
  `linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.1) 100%)`
- **Continue button (enabled):**  
  `linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)` with optional shadow `0px 0px 20px rgba(99,102,241,0.3)`
- **Login button:** Same indigo–blue gradient with 2px border `#6366F1`

**Typography**
- **Heading 1 (“Reserve Your Lane”):** Inter **700**, **40px**, 1.5em line height, center, `#1A237E`
- **Paragraph (“Select your preferred…”):** Inter **400**, **16px**, 1.5em, center, `#717182`
- **Section heading (“Select a date”, “Select a time”):** Inter **600**, **20px**, 1.5em, -1% letter-spacing, left, `#0F172A`
- **Calendar weekday (Su–Sa):** Inter **400**, **~12.8px**, 1.5em, center, `#717182`
- **Calendar day numbers:** Inter **400**, **16px**, 1.5em, `#0A0A0A` (default) or white (selected)
- **Selected day / CTA label:** Inter **600**, **16px**, 1.5em, center
- **Group size label, etc.:** Inter **600**, **14px** or **20px**, `#0F172A`
- **Body / captions:** Inter **400** or **500**, **12–14px**, `#64748B` / `#717182`

**Spacing**
- **Page (Body) padding (desktop):** 96px 30.5px 0
- **Main column (BookingFlow):** padding 0 32px, **gap 32px**
- **Heading block:** gap **8px** between title and paragraph
- **Progress dots:** **10px** gap; first dot 32×8px, others 6.4×8px
- **Date/time card:** padding **33px 33px 1px**, internal **gap 32px**
- **Date + time blocks (desktop):** **44px** gap (row)
- **Calendar:** padding 12px 12px 0; header row height ~19.2px; cell **40×40px**
- **Time-slot buttons:** ~40px height, **8px** gap, **12px** border radius
- **BookingOptions card:** padding **25px 25px 1px**, gap **24px**

**Borders & effects**
- **Card:** 1px solid `#E2E8F0`, **16px** border radius  
  Box shadow: `0px 1px 2px rgba(0,0,0,0.06)`, `0px 1px 3px rgba(0,0,0,0.1)`
- **Calendar header cells:** 8px radius
- **Day buttons:** full radius (pill)
- **Continue button:** full radius (pill), optional glow

---

## 1. step1-desktop-default

**Node ID:** `22:2`  
**Frame size:** 1341×1004 (canvas); content area ~1341×986.

### 1. Layout structure
- **Single column**, full width.
- **Body:** Top padding 96px, horizontal 30.5px; then a **vertical stack** (BookingFlow) with 32px gap, padding 0 32px.
- **Sections (top to bottom):** Heading block → Progress indicator → One **row** containing **date card** (left) and **time card** (right), 44px gap. No sidebar.

### 2. Components present
- **Heading 1:** “Reserve Your Lane”
- **Paragraph:** “Select your preferred date and time to get started”
- **ProgressIndicator:** 4 dots in a row (first filled with gradient, rest `#E2E8F0`)
- **DateTimeSelector (date):**
  - One white card (border, 16px radius, shadow) with:
    - Icon (calendar, 32×32, gradient-tint bg) + “Select a date” (Heading 2)
    - Month nav (e.g. chevrons) 88×40
    - **Calendar:** Su–Sa header row, then 7×~5 grid of day cells (40×40 each); some days **opacity 0.5** (disabled)
- **DateTimeSelector (time):**
  - Second card with “Select a time” and a **grid of time-slot buttons** (e.g. “10:00 AM”, “11:00 AM”…) with availability colors (green/amber/gray), 12px radius, 2px border.

### 3. Visual hierarchy
- **Primary:** “Reserve Your Lane” (large, bold, dark blue).
- **Secondary:** Subtitle and progress (lighter gray).
- **Tertiary:** Two equal-weight cards (date and time); section titles “Select a date” / “Select a time” are strong (600, 20px) but not as big as the main title.

### 4. Text content
- “Reserve Your Lane”
- “Select your preferred date and time to get started”
- “Select a date”
- “Select a time”
- Weekday labels: Su, Mo, Tu, We, Th, Fr, Sa
- Day numbers 1–31
- Time labels (e.g. 10:00 AM, 11:00 AM, …) and optional lane/availability text

### 5. Interactive elements
- **Progress dots:** Visual only (no click).
- **Calendar:** Day cells (40×40) — clickable; disabled days at 0.5 opacity.
- **Month nav:** Left/right chevrons (40×40) — clickable.
- **Time slots:** Each slot is a button (bordered, rounded) — clickable.
- No “Continue” or “Login” in this default state on the main content; Login may appear in a header if present.

### 6. Spacing
- 96px top, 30.5px sides (body).
- 32px between heading, progress, and date/time block.
- 8px between “Reserve Your Lane” and subtitle.
- 10px between progress dots.
- 44px between date card and time card.
- Card internal: 33px padding, 32px gap between header row and calendar.

### 7. Colors
- Page: white; content strip: `#F9FAFB`.
- Title: `#1A237E`; subtitle: `#717182`.
- Progress: first dot gradient (indigo→blue), rest `#E2E8F0`.
- Cards: white fill, `#E2E8F0` border, light shadow.
- Section titles: `#0F172A`; calendar text: `#0A0A0A` / `#717182`; disabled days 0.5 opacity.
- Time slots: green `#10B981`, amber `#F59E0B`, gray for full/closed; borders `#E2E8F0` / `#CBD5E1`.

### 8. Typography
- “Reserve Your Lane”: Inter 700, 40px, center.
- Subtitle: Inter 400, 16px, center.
- “Select a date” / “Select a time”: Inter 600, 20px, left.
- Weekdays: Inter 400, ~12.8px; day numbers: Inter 400, 16px; time labels: 14–16px.

---

## 2. step1-mobile-default

**Node ID:** `23:286`  
**Frame size:** 393×1094.

### 1. Layout structure
- **Single column.** Top: **NavigationBar** (fixed-height strip). Below: same Step 1 content as desktop but **stacked vertically** (no side-by-side date/time).
- **Body:** Same padding concept; BookingFlow is a **column** with 32px gap; date and time sections stack with 32px gap.

### 2. Components present
- **NavigationBar:** “ROYAL Z LANES BOOKING” (left), **Login** pill button (right), bg `rgba(255,255,255,0.8)`, bottom border `#CAD8EC`.
- **Heading 1:** “Reserve Your Lane”
- **Paragraph:** “Select your preferred date and time to get started”
- **ProgressIndicator:** Same 4 dots as desktop.
- **DateTimeSelector (date):** Same card as desktop (calendar + “Select a date” + month nav), full width.
- **DateTimeSelector (time):** “Select a time” card with time-slot grid, full width, below date card.

### 3. Visual hierarchy
- **Primary:** Nav title + “Reserve Your Lane.”
- **Secondary:** Subtitle and progress.
- **Tertiary:** Date card then time card; section titles same weight as desktop.

### 4. Text content
- “ROYAL Z LANES BOOKING”, “Login”
- “Reserve Your Lane”, “Select your preferred date and time to get started”
- “Select a date”, “Select a time”
- Weekdays, day numbers, time labels (same as desktop).

### 5. Interactive elements
- **Login:** Pill button (gradient + border), right side of nav.
- **Calendar:** Day cells, month chevrons.
- **Time slots:** Buttons in grid.
- No “Continue” in default state.

### 6. Spacing
- Nav: full width, internal padding per layout; ~96px gap between nav and content (from 95.99px in spec).
- Content: 32px gap between blocks; card padding 33px; 32px between sections inside card.

### 7. Colors
- Same palette as desktop; nav uses white 0.8 opacity and `#263048` for “ROYAL Z LANES BOOKING”; Login uses gradient and `#6366F1` text/border.

### 8. Typography
- Nav title: Inter 700, 12px (or as per style_TVFSYN).
- “Reserve Your Lane”: 40px or scaled for mobile (e.g. 43px from style_43WEWE); rest mirrors desktop at smaller scale where defined.

---

## 3. step1-mobile-date-selected

**Node IDs:** `19:15`, `23:442`  
**Frame size:** 393×1690 (23:442).

### 1. Layout structure
- Same as **step1-mobile-default** with **one calendar day visibly selected** and time section shown.
- **Column:** Nav → Heading → Progress → **Date card** (with selected day) → **Time card** (visible, 32px gap).

### 2. Components present
- Same as mobile default, plus:
- **Calendar:** One cell has **selected state**: gradient fill (`#6366F1`→`#3B82F6`), white text, optional cell bg `#E9EBEF`.
- **Time block:** “Select a time” and time-slot grid (same as default).

### 3. Visual hierarchy
- Unchanged from mobile default; selected day is the main focus within the date card.

### 4. Text content
- Same as mobile default; selected day shows a single number (e.g. “8”) in white.

### 5. Interactive elements
- Same as mobile default; selected day is still clickable (can change selection).
- Time slots become primary next step.

### 6. Spacing
- Unchanged: 32px between date and time cards, 33px card padding, 32px internal gaps.

### 7. Colors
- **Selected day:** Gradient fill, white text; cell background can be `#E9EBEF`; unselected days `#0A0A0A` or `#717182`; disabled 0.5 opacity.

### 8. Typography
- Selected day: Inter 600, 16px, center, white. Rest as mobile default.

---

## 4. step1-desktop-time-selected

**Node ID:** `19:381`  
**Frame size:** 1341×1004 (or similar); content height 1099.

### 1. Layout structure
- Same as **step1-desktop-default** but **date and time both selected** and a **BookingOptions** block appears below the date/time row.
- **Column:** Heading → Progress → **Row (date card | time card)** → **BookingOptions** card (Group size + Event type + “Continue to details”), 32px gap between row and card.

### 2. Components present
- All from desktop default, plus:
- **BookingOptions card:** White card, 16px radius, border, shadow. Contains:
  - **Group size:** Icon (gradient-tint) + “Group size”; “How many bowlers?” label; **dropdown/pill** (1–10 bowlers); “This is a party/event” **toggle/checkbox**; **“Continue to details”** button (gradient pill, ~210×48px).

### 3. Visual hierarchy
- **Primary:** “Reserve Your Lane” and the **Continue** button.
- **Secondary:** Date/time cards and Group size card.
- **Tertiary:** “This is a party/event”, helper text.

### 4. Text content
- All previous, plus:
- “Group size”, “How many bowlers?”, “This is a party/event”, “Continue to details”.
- Bowler options: “1 bowler”, “2 bowlers”, … “10 bowlers”.

### 5. Interactive elements
- **Bowlers:** Dropdown or stepper (1–10).
- **Party/event:** Checkbox or toggle.
- **Continue to details:** Primary button (gradient, pill); when disabled, gray fill `#E2E8F0`, text `#94A3B8`.

### 6. Spacing
- 32px between date/time row and BookingOptions card.
- Card: 25px 25px 1px padding; 24px gap between “Group size” row and form row; 12px between label and control; button row justified end.

### 7. Colors
- **Continue (enabled):** Gradient indigo→blue, white text, optional shadow `0px 0px 20px rgba(99,102,241,0.3)`.
- **Continue (disabled):** Fill `#E2E8F0`, text `#94A3B8`.
- **Party/event:** Bg `#F9FAFB`, border `#CBD5E1`; checkmark `#64748B`.

### 8. Typography
- “Group size”: Inter 600, 20px, `#0F172A`.
- Labels: Inter 600, 14px; body: Inter 500, 14px, `#64748B`.
- “Continue to details”: Inter 600, 16px, center.

---

## 5. step1-mobile-time-selected

**Node ID:** `23:680`  
**Frame size:** 393×~1690.

### 1. Layout structure
- Same as **step1-mobile-date-selected** with **time slot selected** and **BookingOptions** card below (stacked column, 32px gap).

### 2. Components present
- Nav, heading, progress, date card (with selected day), time card (with selected time), **BookingOptions** card (Group size + party/event + “Continue to details”).

### 3.–8. Visual hierarchy, text, interactions, spacing, colors, typography
- Match **step1-desktop-time-selected** and **step1-mobile-date-selected**: same tokens, same components; layout is single column, full width, with nav on top.

---

## 6. Lane booking/Desktop/Step 1.2

**Node ID:** `19:784`

### 1. Layout structure
- Same as **step1-desktop-time-selected** with full Step 1.2 content: date + time selected, **BookingOptions** card with **extra copy** (“Each lane accommodates up to 6 bowlers”) and **Continue to details**.

### 2. Components present
- Same as step1-desktop-time-selected, plus:
- **Helper text:** “Each lane accommodates up to 6 bowlers” (below group size / party/event, above or near Continue).

### 3.–8.
- Same hierarchy, text, interactivity, spacing, colors, and typography as **step1-desktop-time-selected**; only addition is the helper sentence (e.g. Inter 400 or 500, 12–14px, `#64748B`).

---

## 7. Lane booking/Mobile/Step 1.2

**Node ID:** `23:955`  
**Frame size:** 393×2125.

### 1. Layout structure
- Same as **step1-mobile-time-selected** with **BookingOptions** and optional “Each lane accommodates up to 6 bowlers” in the same card.

### 2.–8.
- Same as **step1-mobile-time-selected** and **Lane booking/Desktop/Step 1.2**: mobile column layout, same tokens and component set; longer scroll height (2125px) due to stacked content.

---

## Summary table

| Screen                     | Node ID  | Size (approx) | Key differentiator                          |
|----------------------------|----------|----------------|---------------------------------------------|
| step1-desktop-default      | 22:2     | 1341×1004     | No selection; date + time cards side by side |
| step1-mobile-default       | 23:286   | 393×1094      | Nav + stacked date/time; no selection       |
| step1-mobile-date-selected | 19:15, 23:442 | 393×1690  | One day selected; time card visible         |
| step1-desktop-time-selected| 19:381   | 1341×1004+    | Date+time selected; BookingOptions + Continue |
| step1-mobile-time-selected | 23:680   | 393×1690      | Date+time selected; BookingOptions + Continue (stacked) |
| Lane booking/Desktop/Step 1.2 | 19:784 | 1341×…        | + “Each lane accommodates up to 6 bowlers”  |
| Lane booking/Mobile/Step 1.2  | 23:955 | 393×2125      | Same as above, mobile layout                 |

Use this doc with `lib/design-tokens.ts` and the Figma node IDs when implementing or auditing Step 1 (date/time selection and group size).
