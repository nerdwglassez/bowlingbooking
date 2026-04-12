# UI primitives (`components/ui`)

## Purpose

Define the reusable UI contracts used across customer and employee interfaces.

## Scope

- In scope: base `ui/*` components and their expected usage boundaries.
- Out of scope: feature-specific booking/staff business logic.
- Linked docs: [BOOKING_COMPONENTS.md](BOOKING_COMPONENTS.md), [STAFF_COMPONENTS.md](STAFF_COMPONENTS.md), [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md).

## Component contracts

| Component | Location | Contract notes |
|-----------|----------|----------------|
| Button | [`components/ui/Button.tsx`](../../components/ui/Button.tsx) | Use for primary/secondary/danger/ghost/outline actions; supports size, rounded, loading state |
| Input | [`components/ui/Input.tsx`](../../components/ui/Input.tsx) | Shared text input styling and label/error conventions |
| Select | [`components/ui/Select.tsx`](../../components/ui/Select.tsx) | Shared select styling for forms/settings |
| PriceInput | [`components/ui/PriceInput.tsx`](../../components/ui/PriceInput.tsx) | Price-normalized input behavior |
| PasswordRequirements | [`components/ui/PasswordRequirements.tsx`](../../components/ui/PasswordRequirements.tsx) | Password policy feedback surface |
| Toast | [`components/ui/Toast.tsx`](../../components/ui/Toast.tsx) | Lightweight notification component |

## Behavioral contract

- All shared actions should default to `Button` before introducing one-off button styling.
- `isLoading` button state must disable user interaction while preserving clear feedback.
- Inputs/selects should keep consistent error and disabled-state affordances across pages.

## Anti-patterns

- Re-creating button variants inline in feature files when `Button` already supports the style.
- Using raw `<input>`/`<select>` in high-touch forms without accessibility labels/error states.

## Security and privacy notes

- UI primitives must not embed or log secret values.
- Password requirement components should only show client-side validation hints, not sensitive policy internals.

## Testing and validation

- Verify variant classes and disabled/loading states remain consistent.
- Verify keyboard and focus accessibility for interactive primitives.

## Change log

- 2026-04-12: Introduced component-layer contract documentation for `ui/*`.

