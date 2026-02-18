# Staff Booking Flow & CSS Audit

Summary of the review and updates for employee experience connectivity, CSS standardization, and dead/orphaned elements.

## 1. Employee experience – connectivity

### Pricing rules
- **Backend**: Staff and customer bookings both use `getPricingSettings()` (from DB) for lane, bowler, shoe, tax. Staff create booking API (`POST /api/staff/bookings`) already calculates total with these settings.
- **Staff Create Booking (Step 4)**: Now loads `/api/pricing` and shows a **price breakdown** in the Review step (lane, bowlers, shoes, packages, subtotal, tax, total) so employees see the amount before creating the reservation. Uses `calculateBookingPriceWithSettings()` so the preview matches the API.
- **Staff Settings → Pricing**: Only **default** pricing (lane/hour, bowler, shoe, tax) is persisted and applied to bookings. The **Custom Pricing Rules** section is UI-only and not saved; a note was added on the page so staff know only default pricing is applied.

### Packages
- Staff Create Booking and customer book flow both use **`/api/packages`** (staff uses it with no filter; customer flow can filter by type). Package selection and prices are consistent.
- Staff Settings → Packages uses **`/api/packages?activeOnly=false`** for management view; “Add Package” links to **Admin** (`/admin/packages/create`) for actual create/edit (by design).

### Saving reservations
- Staff create flow posts to **`POST /api/staff/bookings`** with `userId`, `date`, `startTime`, `duration`, `lane`, `numBowlers`, `shoeSizes`, `packageIds`. Validation uses `bookingSchema`; price is computed server-side from pricing settings. Connectivity is correct.

---

## 2. CSS standardization

- **Staff Create Booking**: All four step cards now use the same pattern: `rounded-2xl border border-slate-200 bg-white p-6 shadow-sm` (aligned with other staff settings cards).
- **Tailwind theme**: `tailwind.config.ts` extended with shared tokens: `booking.page`, `booking.card`, `booking.border`, `booking.text`, `booking.textMuted`, `booking.textSlate`, `primary`, and `shadow.card` for reuse across booking and staff UIs and to reduce duplicated hex values.
- **globals.css**: Unchanged; step1 animations and print/immersive rules kept. No new bloat. Future work: gradually replace inline `style={{ color: '#0F172A' }}` etc. in `app/book/page.tsx` with Tailwind classes (e.g. `text-booking-text`) where it helps consistency.

---

## 3. Screens / elements no longer part of the experience

- **`/staff/settings/special-hours`**: Removed from **StaffHeaderTitle** (title map). This route does not exist under staff; special hours are **admin-only** (`/admin/special-hours`). Staff nav (SettingsNav) does not link to it; only the header title had a dead entry.
- **Analytics**: `/staff/analytics` exists and is still in the header title map; no change.
- **Guest checkout “Checkout Options” block**: Already removed in a prior update (Sign In button + “Or continue as guest” divider in the Create Your Account card, step 4). The guest path is now just the guest form.

---

## Files changed in this pass

- `app/staff/bookings/create/page.tsx` – Pricing fetch, price breakdown in Step 4, unified card styling.
- `app/staff/settings/pricing/page.tsx` – Note that only default pricing is saved and applied; custom rules are not persisted.
- `components/layout/StaffHeaderTitle.tsx` – Removed `/staff/settings/special-hours` title entry.
- `tailwind.config.ts` – Extended theme with booking/primary colors and card shadow.
- `docs/STAFF_BOOKING_AND_CSS_AUDIT.md` – This audit summary.
