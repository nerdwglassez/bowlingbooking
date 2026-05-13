# DESIGN_SYSTEM.md

## What this is
The design system governs every visual element in
the application. It has four layers. Aesthetic changes
only ever touch Layer 1 or Layer 2. Pages and patterns
are never directly styled — they compose components.

## The four layers

```
Layer 1 — Tokens        src/styles/globals.css + tokens.css
Layer 2 — Primitives    src/components/ui/
Layer 3 — Patterns      src/components/patterns/
Layer 4 — Pages         app/**/page.tsx
```

Changes cascade downward automatically.
Never style at Layer 3 or 4 directly.

---

## Layer 1 — Design tokens

File: src/styles/tokens.css
Imported once in globals.css, available everywhere.

### Palette (NEVER use directly in components — building blocks only)
```css
--palette-amber-50:   #FFFBEB;
--palette-amber-100:  #FEF3C7;
--palette-amber-200:  #FDE68A;
--palette-amber-300:  #FCD34D;
--palette-amber-400:  #FBBF24;
--palette-amber-500:  #F59E0B;
--palette-amber-600:  #D97706;
--palette-amber-700:  #B45309;
--palette-amber-800:  #92400E;
--palette-amber-900:  #78350F;

--palette-stone-50:   #FAFAF9;
--palette-stone-100:  #F5F5F4;
--palette-stone-200:  #E7E5E4;
--palette-stone-300:  #D6D3D1;
--palette-stone-400:  #A8A29E;
--palette-stone-500:  #78716C;
--palette-stone-600:  #57534E;
--palette-stone-700:  #44403C;
--palette-stone-800:  #292524;
--palette-stone-900:  #1C1917;

--palette-purple-900: #1E0A2E;
--palette-purple-800: #2D1245;
--palette-purple-700: #3D1A5C;
--palette-purple-400: #A855F7;
--palette-purple-300: #C084FC;

--palette-green-100:  #D1FAE5;
--palette-green-400:  #6EE7B7;
--palette-green-500:  #10B981;
--palette-green-800:  #065F46;

--palette-red-100:    #FEE2E2;
--palette-red-300:    #FCA5A5;
--palette-red-400:    #F87171;
--palette-red-700:    #B91C1C;
--palette-red-800:    #991B1B;
```

### Semantic tokens — surfaces
```css
--surface-ground:     #F5F2EE;   /* page background */
--surface-card:       #FDFCFA;   /* cards, inputs */
--surface-raised:     #FFFFFF;   /* elevated panels */
--surface-sunken:     #EDE9E3;   /* recessed areas */
--surface-dark:       #1E0A2E;   /* headers, featured */
--surface-dark-mid:   #292524;
--surface-overlay:    rgba(0,0,0,0.18);
```

### Semantic tokens — action (primary interactive color)
```css
--color-action:        #F59E0B;
--color-action-hover:  #D97706;
--color-action-subtle: #FFFBEB;  /* hover bg */
--color-action-tint:   #FEF3C7;  /* selected bg */
--color-action-text:   #92400E;  /* text ON action-tint bg — WCAG AA */
--color-action-dark:   #FBBF24;  /* action color on dark surfaces */
```

### Semantic tokens — text
```css
--color-text-primary:   #1C1917;
--color-text-secondary: #57534E;
--color-text-muted:     #A8A29E;
--color-text-inverted:  #FDFCFA;
--color-text-on-action: #FFFFFF;
```

### Semantic tokens — borders
```css
--color-border:        #E7E5E4;
--color-border-strong: #D6D3D1;
--color-border-subtle: #F0EDE8;
```

### Semantic tokens — status
```css
--status-ok-bg:          #D1FAE5;
--status-ok-text:        #065F46;
--status-ok-border:      #A7F3D0;
--status-warning-bg:     #FEF3C7;
--status-warning-text:   #92400E;
--status-warning-border: #FDE68A;
--status-error-bg:       #FEE2E2;
--status-error-text:     #991B1B;
--status-error-border:   #FECACA;
--status-info-bg:        #EFF6FF;
--status-info-text:      #1E40AF;
--status-info-border:    #BFDBFE;
```

### Dark mode overrides — [data-theme="dark"]
```css
--surface-ground:     #0F0E0D;
--surface-card:       #1C1917;
--surface-raised:     #292524;
--surface-sunken:     #141211;
--surface-dark:       #0D0517;
--surface-overlay:    rgba(0,0,0,0.45);

--color-text-primary:   #FAFAF9;
--color-text-secondary: #A8A29E;
--color-text-muted:     #57534E;
--color-text-inverted:  #1C1917;

--color-border:         #292524;
--color-border-strong:  #44403C;
--color-border-subtle:  #1C1917;

--color-action-subtle: rgba(245,158,11,0.07);
--color-action-tint:   rgba(245,158,11,0.12);
--color-action-text:   #FBBF24;
--color-action-dark:   #FBBF24;

--status-ok-bg:          rgba(16,185,129,0.12);
--status-ok-text:        #6EE7B7;
--status-ok-border:      rgba(16,185,129,0.25);
--status-warning-bg:     rgba(245,158,11,0.10);
--status-warning-text:   #FCD34D;
--status-warning-border: rgba(245,158,11,0.25);
--status-error-bg:       rgba(239,68,68,0.10);
--status-error-text:     #FCA5A5;
--status-error-border:   rgba(239,68,68,0.25);
--status-info-bg:        rgba(59,130,246,0.10);
--status-info-text:      #93C5FD;
--status-info-border:    rgba(59,130,246,0.25);
```

### Typography
```css
--font-display: 'Fraunces', Georgia, serif;   /* headings, prices, names */
--font-body:    'DM Sans', system-ui, sans-serif;  /* everything else */
```

### Radius
```css
--radius-sm:   0.375rem;   /* 6px  — badges */
--radius-md:   0.75rem;    /* 12px — inputs, small cards */
--radius-lg:   1rem;       /* 16px — cards, panels */
--radius-xl:   1.5rem;     /* 24px — featured cards */
--radius-full: 9999px;     /* pills, avatars */
```

### Shadows
```css
--shadow-sm:  0 1px 2px rgba(28,25,23,0.06);
--shadow-md:  0 4px 12px rgba(28,25,23,0.08), 0 1px 3px rgba(28,25,23,0.06);
--shadow-lg:  0 12px 32px rgba(28,25,23,0.10), 0 2px 8px rgba(28,25,23,0.06);
--shadow-xl:  0 24px 48px rgba(28,25,23,0.12), 0 4px 12px rgba(28,25,23,0.08);
```

---

## Layer 2 — Primitive components

Directory: src/components/ui/

Each component references ONLY CSS variable tokens.
Never uses raw color values or Tailwind color classes.
Exports named variants covering all use cases.

### Button — src/components/ui/button.tsx
Variants: PRIMARY | SECONDARY | GHOST | DANGER | DARK
Sizes: sm | md (default) | lg
Props: variant, size, fullWidth, disabled, loading

PRIMARY
  background: --color-action
  color: white
  border-radius: --radius-lg
  box-shadow: 0 0 20px rgba(245,158,11,0.25)
  disabled: opacity 0.35

SECONDARY
  background: --surface-sunken
  color: --color-text-secondary
  border: 1.5px solid --color-border

GHOST
  background: transparent
  color: --color-text-secondary
  border: none

DANGER
  background: --status-error-bg
  color: --status-error-text
  border: 1px solid --status-error-border

DARK (on --surface-dark backgrounds)
  background: rgba(255,255,255,0.08)
  color: --color-text-inverted
  border: 1px solid rgba(255,255,255,0.12)

### Card — src/components/ui/card.tsx
Variants: DEFAULT | SUNKEN | FEATURED

DEFAULT
  background: --surface-card
  border: 1.5px solid --color-border
  border-radius: --radius-lg
  padding: 16px

SUNKEN
  background: --surface-sunken
  border: 1.5px solid --color-border

FEATURED (dark header card)
  background: --surface-dark
  border-radius: --radius-xl
  padding: 20px
  No border

### Input — src/components/ui/input.tsx
  background: --surface-card
  border: 1.5px solid --color-border
  border-radius: --radius-md
  padding: 12px 14px
  font: --font-body 14px
  placeholder: --color-text-muted
  focus: border-color --color-action
  error: border-color --status-error-border, background --status-error-bg

### Select — src/components/ui/select.tsx
  Same base as Input
  Custom chevron SVG (stone-400 stroke)
  appearance: none

### Badge — src/components/ui/badge.tsx
Variants: DEFAULT | ACTION | SUCCESS | WARNING | ERROR | MUTED | ROLE
All use --radius-full (pill shape)

### Toggle — src/components/ui/toggle.tsx
  ON:  background --color-action, knob right
  OFF: background --color-border-strong, knob left
  Width 40px, Height 22px

### Checkbox — src/components/ui/checkbox.tsx
  Unchecked: 20px, border-radius 5px, border --color-border-strong
  Checked: background --color-action, white checkmark SVG

### Sheet — src/components/ui/sheet.tsx
  background: --surface-raised
  border-top: 1px solid --color-border
  Handle: 32×3px, --color-border-strong, centered

### TabBar — src/components/ui/tab-bar.tsx
  Staff app: background #120620, active icon --color-action, 2px amber top bar

---

## Layer 3 — Pattern components

Directory: src/components/patterns/
Composed ONLY from Layer 2 primitives. No raw styles.

Key patterns:
- BookingStepShell — header, step dots, hold bar, scrollable content, price footer
- FeaturedBookingCard — dark card, confirmation code, booking details, action buttons
- StaffCockpitHeader — purple surface, venue name (Fraunces), role badge, avatar
- LaneTimelineRow — lane label, track bar, booking blocks, now-line
- PackageCard — package info, price, includes flags, select button
- PriceFooter — dark surface, line items, total, CTA button

---

## Tenant theme override

File: src/styles/themes/{tenant-slug}.css
Override ONLY --color-action family and --surface-dark if needed.
No component files ever need to change for a rebrand.

```css
/* Example: kingpin-lanes.css */
:root {
  --color-action:       #22C55E;
  --color-action-hover: #16A34A;
  --color-action-dark:  #4ADE80;
  --surface-dark:       #0A1628;
}
```

---

## Theme switching

Theme controlled by data-theme on <html>.
NEVER use Tailwind dark: prefix — it bypasses the token system.

Customer app → data-theme="light" default, user can toggle
Staff app    → data-theme="dark" always
Emails       → always light (email clients ignore CSS vars)

---

## Critical rules — NEVER do these

1. Use raw color values: WRONG: background: '#F59E0B' | RIGHT: background: var(--color-action)
2. Use Tailwind color classes: WRONG: bg-amber-500 | RIGHT: use Button PRIMARY variant
3. Create one-off styled elements in pages
4. Duplicate component logic across screens
5. Style at the page level (pages = layout + composition only)
6. Hardcode font strings: WRONG: fontFamily: 'Fraunces' | RIGHT: fontFamily: var(--font-display)
7. Override component styles from outside: WRONG: <Button className="bg-red-500"> | RIGHT: <Button variant="danger">
8. Use palette tokens directly in components: WRONG: color: var(--palette-green-400) | RIGHT: color: var(--status-ok-text)
9. Use Tailwind dark: prefix — data-theme system handles both modes

---

## Typography scale
9px  — uppercase labels, badges, tab labels
10px — section labels, metadata
11px — secondary text, policy notes
12px — body small, form labels
13px — body default, list items
14px — button text, input text
16px — card titles
17px — step titles (mobile)
20px+ — display (Fraunces), prices, names
26px — dashboard greeting name
36px — staff stat total number
