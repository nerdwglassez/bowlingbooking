# iPad QA checklist (staff web app)

Use this after staff UI refactors to validate touch-first behavior without changing workflows.

## Devices / browsers

- iPad Safari (latest)
- iPad Chrome (latest)
- Split view and full-screen modes where possible

## Core flows

- [ ] Staff dashboard (`/staff`) loads with no layout clipping.
- [ ] Calendar month view (`/staff/calendar`) supports day selection via touch.
- [ ] Calendar timeline view (`/staff/calendar?view=timeline`) renders booking blocks and opens booking detail on tap.
- [ ] Booking detail (`/staff/bookings/[id]`) action buttons are tappable with no overlap.
- [ ] Edit reservation flow still saves and refreshes list/calendar state.

## Touch targets (minimum)

- [ ] Primary actions are at least ~44px high (`New booking`, `Today`, `Timeline view`, modal CTAs).
- [ ] Row action trigger/menu items are tappable without accidental adjacent taps.
- [ ] Search inputs remain usable with on-screen keyboard and no focus jump.

## Responsiveness

- [ ] Dashboard cards and table remain readable at common iPad widths.
- [ ] Calendar right-side panel does not overlap main calendar/timeline content.
- [ ] Modal content remains scrollable and actions stay reachable.

## Regression checks

- [ ] Existing month calendar behavior remains unchanged when `view` query param is absent.
- [ ] Existing staff bookings table sorting/filtering/actions still work.
- [ ] Existing API consumers keep functioning (no contract changes required).

## Notes template

Record any issue with:

1. Route + viewport/breakpoint
2. Repro steps
3. Expected vs actual
4. Screenshot/video if available
