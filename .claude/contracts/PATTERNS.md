# Patterns Contract

Source of truth for **every file under `src/components/patterns/`**. Agents building patterns MUST read this file, the primitives contract (`.claude/contracts/PRIMITIVES.md`), and at least one existing primitive (`src/components/ui/button.tsx`) before writing code.

A **pattern** is one named visual concept composed of primitives plus business-logic helpers from `src/lib/`. Patterns are the only place that:
- Compose primitives together with layout rules.
- Call business-logic helpers like `getLaneCount`, `formatPrice`, `calculatePrice`.
- Take domain shapes (`Package`, `Booking`, `TimeSlot`, etc.) as props.

Patterns NEVER define their own colors, fonts, shadows, or borders — those live in tokens and arrive via primitives. Patterns are layout + composition + data-rendering only.

---

## 1. Layer rules

```
tokens → primitives (ui/) → patterns (this layer) → pages
```

A pattern can import:
- Any primitive from `src/components/ui/*`.
- Any pure helper from `src/lib/*` (lane-logic, pricing, theme, etc.).
- Types from `src/types`.
- React.
- `@radix-ui/react-slot` — but only if the pattern itself benefits from `asChild`. Most patterns won't.

A pattern can NOT import:
- Other patterns (no pattern-of-patterns). If two patterns share structure, lift that structure into a primitive or accept it via children/props.
- Anything from `src/app/*` (pages own their own routing/data).
- `prisma`, `stripe`, `auth`, `email` — those are server-only and patterns are renderers.
- Raw CSS files — styles arrive via tokens, which arrive via primitives.

---

## 2. Hard rules (drift sentinel runs on `src/components/patterns/` too)

Same drift constraints as primitives:

1. **No raw hex colors.** Use `var(--token)` references or — preferably — let primitives carry the color. If your pattern is reaching for `bg-[var(--surface-card)]` directly, ask whether a `<Card>` would be a better wrapper.
2. **No Tailwind color utilities.** No `bg-amber-500`, `text-stone-700`, etc.
3. **No `dark:` prefix.** Same theming model — `data-theme` swap, primitives handle it.
4. **Tailwind is for layout only.** `flex`, `grid`, `gap`, `p-*`, `mx-*`, sizing, positioning — all fine. Color/font/border utilities are not.
5. **No `bg-[var(--…)]` on plain `<div>`s** when a primitive exists. If the visual is a card, use `<Card>`. If it's a badge, use `<Badge>`. If it's a button, use `<Button>`. Only reach for `var(--…)` arbitrary classes when no primitive matches and you've documented why in a code comment.
6. **No font-family declarations.** Primitives set `--font-body` / `--font-display`. Pattern-level headings (h1–h6) inherit via the global CSS in `src/app/globals.css`. Use the existing `h2 / h3 / h4` tags rather than `<div className="text-lg font-semibold">`.
7. **All stateful patterns must be CONTROLLED.** Accept `value` (or `selectedId` / `bowlerCount` / similar) and `onChange` props. NEVER own state internally with `useState`. The booking page (Phase 5) owns the form state via `BookingContext`; patterns are dumb renderers + event emitters.

   **Narrow exception: time-derived display.** A pattern may subscribe to wall-clock time (e.g. `HoldTimer` rendering a countdown from `expiresAt: Date`) using `useSyncExternalStore` against a module-level tick store. This is *not* component state — it's an external subscription. `useState` is still banned. Document the exception with a comment at the top of any file that uses this pattern.
8. **`'use client'` only when you genuinely need React event handlers or hooks.** Pure display patterns (PriceFooter, StepIndicator with no interaction) stay server-safe. Stateful selectors (BowlerCounter, DateStrip, TimeSlotGrid, PackageCard with `onSelect`) need `'use client'`.
9. **No business-logic forking.** If pricing or lane-count math appears in your pattern, you've gone wrong — call `formatPrice` / `getLaneCount` from `lib/`. The drift sentinel includes a `Math.ceil(.*\/ 6` check on the patterns layer that fails any file outside `lib/lane-logic.ts` containing that formula.
10. **No tenant-specific text.** Never hardcode "Royal Z Lanes", "123 Main St", phone numbers, or hours. Tenant data arrives via props or `getTenant()` (which the calling page resolves once). Patterns are tenant-agnostic.

---

## 3. File location and naming

- One pattern per file in `src/components/patterns/`.
- File names are kebab-case matching the default export: `bowler-counter.tsx`, `date-strip.tsx`, `time-slot-grid.tsx`, `package-card.tsx`, `price-footer.tsx`, `step-indicator.tsx`.
- Each file exports the component named with PascalCase (`BowlerCounter`) and an associated props type (`BowlerCounterProps`).
- Patterns with multiple parts (e.g. PriceFooter with PriceFooter + PriceFooterAction) export both from the same file, like Card exports CardHeader/CardBody/CardFooter.

---

## 4. Required surface per pattern

| Aspect | Rule |
|---|---|
| `className` | Forward to the root element, appended last so callers can override layout. |
| `disabled` / `loading` | If the pattern wraps an action, pass them through to the underlying primitive(s). |
| Controlled state | Accept `value`/`onChange` (or domain-specific names like `bowlerCount`/`onBowlerCountChange`). NO `useState` for selection. |
| Forward refs | Only when the pattern has a single semantic root element a parent might want to focus or measure. Skip when the pattern is a multi-section composition. |
| Display name | Set `displayName` if you used `forwardRef`. |
| ARIA | Stepper, grid, listbox, dialog, etc. — pick the right ARIA role for the pattern's purpose. Read W3C ARIA Authoring Practices if uncertain; do NOT invent custom semantics. |

---

## 5. Per-pattern scope notes

Each of the six patterns in the current batch. Read the named wireframe AND the existing primitives + lib helpers before starting your file.

### `step-indicator.tsx` — `StepIndicator`
**Wireframe:** `docs/wireframes/customer/booking-step1.html` (top of phone — 4 dots).
- Props: `currentStep: 1 | 2 | 3 | 4`, `totalSteps?: number` (default 4), `className?: string`.
- Visual: row of round dots with `gap-2`. Active dot: `bg-[var(--color-action)]`, larger (w-6 vs w-2). Completed dots: `bg-[var(--color-action)]` regular size. Future dots: `bg-[var(--color-border-strong)]`.
- ARIA: render as `<ol aria-label="Booking progress">` with `<li>` children. Active item has `aria-current="step"`.
- Server-safe. No `'use client'`. No state.

### `bowler-counter.tsx` — `BowlerCounter`
**Wireframe:** `docs/wireframes/customer/booking-step1.html` (− / count / + in Bowlers section).
- Props: `value: number`, `onChange: (next: number) => void`, `min?: number` (default 1), `max?: number` (default 18, the venue's max online), `className?: string`.
- Visual: − Button (ghost, size sm) + a large number (h2 or h1, font-display) + + Button. Below, render the lane-count caption: call `getLaneAssignmentSummary(value)` from `src/lib/lane-logic.ts`. Append `· max ${max} online` when `value === max`.
- If `value === max`, the + button is disabled. If `value === min`, the − button is disabled.
- `'use client'`.
- Use the `<Button>` primitive. NO custom `<button>`s.

### `date-strip.tsx` — `DateStrip`
**Wireframe:** `docs/wireframes/customer/booking-step1.html` and `booking-step2-refined.html` (horizontal scrolling row of day chips).
- Props: `dates: Array<{ date: string /* YYYY-MM-DD */; weekday: string /* "Mon" */; day: number /* 12 */; available: boolean }>`, `selectedDate: string | null`, `onSelect: (date: string) => void`, `className?: string`.
- Visual: horizontal `flex gap-2 overflow-x-auto` row. Each chip is a `<Button>` primitive — `variant="secondary"` unselected, `variant="primary"` when `selectedDate === date.date`. Unavailable dates render as ghost-variant buttons with `disabled`. Inside the button, two lines: weekday (small caps, text-xs) and day number (font-display, text-lg).
- `'use client'`.
- ARIA: `<div role="listbox" aria-label="Choose a date">` with `<Button role="option" aria-selected={...}>`.

### `time-slot-grid.tsx` — `TimeSlotGrid`
**Wireframe:** `docs/wireframes/customer/booking-step2-refined.html` (responsive grid of times).
- Props: `slots: TimeSlot[]` (from `@/types`), `selectedSlotId: string | null`, `onSelect: (slot: TimeSlot) => void`, `className?: string`.
- Visual: `grid grid-cols-3 gap-2 sm:grid-cols-4`. Each cell is a `<Button>` primitive: `variant="primary"` if selected, `variant="secondary"` if available, `variant="ghost"` + `disabled` if not. Inside: time formatted as `h:mm a` (use `Intl.DateTimeFormat`, NOT a third-party lib). Optionally render a small `<Badge variant="ok">Popular</Badge>` below the time if you decide to flag popular slots — but only if the data carries that hint (it doesn't yet, so SKIP this feature in v1).
- `'use client'`.
- ARIA: `<div role="radiogroup" aria-label="Choose a time">`.

### `package-card.tsx` — `PackageCard`
**Wireframe:** none yet — infer from `.claude/DESIGN_SYSTEM.md` Card patterns and the `Package` type. Render a CardHeader with `<h3>` package name + `<Badge>` for `partyTypes[0]` if present, CardBody with description and the list of what's included (game/shoes), and CardFooter with the price (call `formatPrice(pkg.basePrice)`) plus a select Button.
- Props: `pkg: Package` (from `@/types`), `selected: boolean`, `onSelect: (pkg: Package) => void`, `className?: string`.
- Visual: use `<Card variant={selected ? 'elevated' : 'default'}>`. When selected, also add a `border-[var(--color-action)]` override via className.
- `'use client'`.
- The footer Button: `variant="primary"` when not selected (label: "Select"), `variant="secondary"` when selected (label: "Selected").

### `venue-header.tsx` — `VenueHeader`
**Wireframe:** `docs/wireframes/customer/booking-step1.html` (top of phone — venue name + address + sign-in button).
- Props: `venueName: string`, `address: string`, `signedIn?: boolean`, `onSignIn?: () => void`, `signInLabel?: string` (default "Sign in"), `className?: string`.
- Structure: `<header className="flex items-center justify-between gap-3">`. Left side: a column with venue name (h2 or h3, default heading style) and address as `<p className="text-sm text-[var(--color-text-secondary)]">`. Right side: a `<Button variant="ghost" size="sm">` for sign-in if `!signedIn && onSignIn`, otherwise render nothing.
- DO NOT hardcode any tenant text. `venueName`, `address`, and the optional user state all come in via props. (The calling page resolves these from `getTenant()` / `auth()`.)
- `'use client'` so callers can pass a click handler — small cost, broad reuse.

### `hold-timer.tsx` — `HoldTimer`
**Wireframe:** `docs/wireframes/customer/booking-step1.html` and `booking-step2-refined.html` (small pill near the top showing remaining hold time).
- Props: `expiresAt: Date | null`, `onExpire?: () => void`, `className?: string`.
- When `expiresAt` is null, render a passive "Select a time to reserve your lanes" pill in `--surface-sunken` / `--color-text-secondary`.
- When `expiresAt` is in the future, render a live pill showing `m:ss` remaining. Background: `--status-warning-bg` if less than 2 minutes, otherwise `--status-ok-bg`. Text uses the matching status `--*-text` token.
- When `expiresAt` is reached, call `onExpire` (once) and render "Hold expired — pick a new time" with `--status-error-*` tokens.
- **Pattern exception:** uses `useSyncExternalStore` against a module-level 1-second tick store. NO `useState`. See §2 rule 7. Add a top-of-file comment explaining the exception.
- `'use client'`.

### `lane-allocation-view.tsx` — `LaneAllocationView`
**Wireframe:** `docs/wireframes/customer/booking-step3-final.html` (lane visualization showing N lanes assigned).
- Props: `bowlerCount: number`, `className?: string`.
- Compute `laneCount = getLaneCount(bowlerCount)` from `@/lib/lane-logic`. Render summary text via `getLaneAssignmentSummary(bowlerCount)`.
- Display: a small horizontal stack — render `laneCount` lane tiles styled with `bg-[var(--color-action)]` text-on-action, each labeled "Lane 1", "Lane 2", … Below the tiles, render the summary text.
- Lane numbers shown here are PLACEHOLDERS (1..N) for visualization. Actual lane numbers come from the server later in the flow and pass through `BookingSummaryCard`, not here.
- Server-safe. NO `'use client'`. No state.

### `booking-summary-card.tsx` — `BookingSummaryCard`
**Wireframe:** `docs/wireframes/customer/booking-step4-confirmation.html` and `customer-dashboard.html`.
- Props:
  - `dateLabel: string` — pre-formatted, e.g. "Saturday, Jan 18"
  - `timeLabel: string` — pre-formatted, e.g. "8:00pm – 10:00pm"
  - `bowlerCount: number`
  - `laneCount: number`
  - `laneNumbers?: number[]` — actual numbers if known (e.g. `[3, 4]`); render as "Lanes 3, 4" if present, else fall back to "N lanes"
  - `packageName: string`
  - `totalAmount: number` — integer cents
  - `className?: string`
- Structure: `<Card variant="default">` → `<CardHeader>` with date+time → `<CardBody>` with a key/value list (Bowlers, Lanes, Package) → `<CardFooter>` with "Total" / `formatPrice(totalAmount)`.
- Server-safe. No state. No interaction — pure read-only summary.

### `empty-state.tsx` — `EmptyState`
**Wireframe:** none — derive from `.claude/DESIGN_SYSTEM.md`.
- Props: `title: string`, `description?: string`, `action?: React.ReactNode` (slot for a Button — DO NOT take `onAction`+`actionLabel`), `className?: string`.
- Structure: a centered column inside a `<Card variant="flat">` with vertical padding (`py-12`). H3 for title, paragraph for description, action below.
- Server-safe. No state.

### `price-footer.tsx` — `PriceFooter`
**Wireframe:** `docs/wireframes/customer/booking-step2-refined.html`, `booking-step3-final.html`, `booking-step4-confirmation.html` (sticky bottom card).
- Props: `pricing: PricingResult` (from `@/types`), `ctaLabel: string`, `onCta: () => void`, `ctaDisabled?: boolean`, `ctaLoading?: boolean`, `className?: string`.
- Visual: `<Card variant="elevated">` positioned by the parent (the pattern does NOT set `position: sticky` — that's a page-layout concern, the pattern just renders the card). CardBody contains a vertical list of `pricing.lineItems` rendered as label/amount rows. CardFooter contains a row: "Total" label on the left, big bold price on the right, then a full-width Button below using `ctaLabel`, `onCta`, `ctaDisabled`, `ctaLoading`.
- This pattern is mostly read-only display — accept `'use client'` only because the CTA needs a click handler. The line-item rendering itself is server-safe markup.
- Use `formatPrice` from `@/lib/pricing` for every monetary value. NEVER do `${amount / 100}.toFixed(2)` inline.

---

## 6. Imports cheat sheet

```tsx
// Primitives
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Toggle } from '@/components/ui/toggle'

// Business logic
import { getLaneCount, getLaneAssignmentSummary, isEligibleForOnlineBooking } from '@/lib/lane-logic'
import { calculatePrice, formatPrice } from '@/lib/pricing'

// Types
import type { Package, Booking, TimeSlot, PricingResult, LineItem } from '@/types'
```

The `@/` alias resolves to `src/` (see `tsconfig.json`). Always use the alias, never `../../../`.

---

## 7. Verification

```bash
npm run verify
```

That runs `tsc --noEmit`, `eslint`, and the drift sentinel (`scripts/drift-check.mjs`) across all primitives and patterns. It checks for raw hex, banned Tailwind color utilities, `dark:` prefix, direct `--palette-*` references, `'use client'` in primitives, inline lane-count math, inline price formatting, `useState` in patterns (patterns must be controlled), and sticky/fixed positioning in patterns. Output prints a per-check summary; exit 0 means all clean. On failure it lists every violation with file, line, match, and fix hint.

If you want to scope drift to just your file: `node scripts/drift-check.mjs --files src/components/patterns/<your-pattern>.tsx`.

---

## 8. What you do NOT do

- Do **not** modify any file outside `src/components/patterns/`. If a primitive needs a new variant, that's a separate request — stop and report it.
- Do **not** create new business-logic files in `src/lib/`. If you need a calculation, it belongs in `lib/` and the Domain agent owns adding it.
- Do **not** add new dependencies. The set authorized for patterns is: React, primitives, lib helpers, types. That's it.
- Do **not** install icon libraries. Render SVGs inline using `currentColor` and inherit color from the surrounding primitive's text token.
- Do **not** wrap a pattern in a route file or test file. Single `.tsx` file only.
- Do **not** add comments narrating obvious code. Comments are for non-obvious intent only.
