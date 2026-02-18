# Step 1 Interaction Specifications

Reference implementation of the Step 1 (date & time selection) prototype. Animations respect `prefers-reduced-motion: reduce`.

## 1. Date Selection Flow

- **Calendar**: Inline in left card; selecting a date gives gradient background; previous selection returns to default.
- **Focus**: Date input / calendar area gets primary focus ring (`#6366F1`).
- **Side effects**: Time slot grid enters loading state (skeleton); after load, time slots stagger in and section scrolls into view.

## 2. Time Slot Selection Flow

- **On click (selected slot)**: Gradient background, white text, checkmark (top-right), 200ms transition; border disappears.
- **Other slots**: Previous selection returns to default (gradient fades out, checkmark fades out).
- **Continue button**: Becomes enabled (gradient, shadow, cursor pointer); one-time pulse (1.0 → 1.02 → 1.0) when it first becomes enabled.
- **Booking summary**: Time value fades in; total row gets a subtle highlight pulse when time is selected.

## 3. Hover States

- **Time slot (available)**: Scale 1.02, shadow, border more prominent, 150ms ease-out, cursor pointer.
- **Time slot (disabled/full)**: No hover, cursor not-allowed, opacity 0.5.
- **Time slot (selected)**: Scale 1.01 on hover, shadow intensifies, 150ms.
- **Continue (enabled)**: Scale 1.02, shadow emphasized, 150ms.
- **Continue (disabled)**: No hover, cursor not-allowed.

## 4. Loading States

- **When date changes**: Time slot grid shows 3 skeleton rectangles; pulse animation (opacity 0.5 → 1 → 0.5, 1.5s loop).
- **Grid**: 2 columns on mobile, 3 on desktop for skeleton and time slots.

## 5. Error States

- **No available times**: CalendarX icon (48px, red), “No availability” heading, message, light red background, red border, fade-in 300ms.
- **Validation (continue without date/time)**: Continue button shake (3 cycles, 400ms); toast from top: “Please select both a date and time”, red background, error icon, auto-dismiss 3s.

## 6. Focus States (Keyboard)

- Date day buttons and time slot buttons: `focus-visible:ring-2 ring-[#6366F1] ring-offset-2`.
- Continue button: same focus ring when enabled.
- Tab order: date calendar → time slots (left to right, top to bottom) → Continue.

## 7. Scroll Behavior

- After time slots load: smooth scroll to bring time slot section into view.
- After time selection: Group size card is visible and already scrolls into view when it appears (existing behavior).

## 8. Animation Timing

- Micro-interactions (hover): 150ms.
- State changes (selection): 200–300ms.
- Content reveal (stagger): 300ms per item, 50ms stagger delay.
- Easing: ease-out for most; keyframes in `app/globals.css` (`step1-*`).
