# Architecture conventions

This document defines the default layering and naming rules for ongoing incremental refactors.

## Goals

- Preserve booking and staff behavior while refactoring.
- Keep UI, orchestration, and business rules separable.
- Reduce coupling between customer and staff feature code.

## Layer map

Use these layers as a dependency direction guide (top can depend on lower layers, lower layers should not depend on higher layers):

1. `app/*` (route entrypoints, page-level orchestration)
2. `components/{feature}/*` (feature-specific UI for booking, staff, admin, etc.)
3. `components/shared/*` (cross-feature composites)
4. `components/ui/*` and `components/shadcn/ui/*` (UI primitives and wrappers)
5. `hooks/*` (UI orchestration and async state)
6. `lib/*` (business rules, data mapping, helpers, server/client-safe utilities)

## Import direction rules

- `app/*` can import from `components/*`, `hooks/*`, and `lib/*`.
- `components/{feature}/*` can import from `components/shared/*`, `components/ui/*`, `hooks/*`, and `lib/*`.
- `components/shared/*` can import from `components/ui/*`, `hooks/*`, and `lib/*`, but should not import from `components/{feature}/*`.
- `hooks/*` can import from `lib/*` and other hooks, but should not import from `app/*`.
- `lib/*` must not import from `components/*` or `hooks/*`.

## Naming conventions

- UI components: `PascalCase.tsx` (`StaffCalendarSidebar`, `BookingStepLayout`).
- Hooks: `useXxx.ts` (`useStaffCalendarData`, `useBookingCheckoutFlow`).
- Domain utilities: `kebab-case.ts` grouped by domain (`lib/staff/scheduling.ts`, `lib/booking/rules.ts`).
- Shared exported types live near their domain (`lib/staff/*`, `lib/booking/*`) rather than inside view files.

## Refactor guardrails

- Preserve existing route URLs and query parameters.
- Keep payload shapes backward compatible unless explicitly versioned.
- Prefer extraction over rewrite: move logic into helpers/hooks, then simplify call sites.
- If behavior changes, update flow docs and `PRD_GAP_ANALYSIS.md`.

## Phase gate checklist

Before moving to the next refactor phase:

1. Run lint on touched files.
2. Run type checks (global if feasible, otherwise scoped verification for touched areas when pre-existing global errors exist).
3. Run any added or impacted tests.
4. Manually sanity check affected user flows in code review.
