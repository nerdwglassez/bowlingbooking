# PRD Gap Analysis

Comparison of the **bowling-prd.md** requirements vs. the current **bowling-reservation-system** app.  
Aligned with **IMPLEMENTATION_PHASES.md** (Phase 1 & Phase 2 complete). Use this to prioritize remaining updates.

**Route and API maps (for implementation / AI context):** [docs/RESERVATION_FLOW.md](docs/RESERVATION_FLOW.md) (customer), [docs/STAFF_AND_ADMIN_EXPERIENCE.md](docs/STAFF_AND_ADMIN_EXPERIENCE.md) (internal), [docs/SHARED_PLATFORM.md](docs/SHARED_PLATFORM.md) (shared).

**Other references:** [docs/README.md](docs/README.md) (full doc index), [docs/STAFF_BOOKING_AND_CSS_AUDIT.md](docs/STAFF_BOOKING_AND_CSS_AUDIT.md) (historical audit), [docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md) (checklist).

---

## ✅ Already Aligned (Implemented)

### Landing & Booking (PRD 1.2, 1.3)

- **Landing = Step 1 of booking** – `/` redirects to `/book`
- **Sticky booking header** – `AppExperienceHeader` `variant="booking"`: venue (name + address), **Login** (opens sign-in modal) when signed out; signed-in users see name, email, initials, My Bookings or Staff/Admin, Profile, Log out
- **Sign In modal** – Sign In / Sign Up tabs, no navigation away; first/last name, email, phone, password, agree to Terms; post-auth role routing (customer → dashboard, staff/manager/admin → staff area)
- **4-step booking flow** – Date & Time → Booking Details → Packages & Extras → Review & Payment
- **Step 2** – Per-bowler shoe (size or “Own shoes”), running total
- **Step 4** – Itemized breakdown, guest checkout or sign-in, **Terms acceptance** checkbox, **Stripe** payment (card; optional Apple/Google Pay), Complete Booking
- **Step 5 – Confirmation** – Reference, QR code, Add to Calendar, View My Bookings, **Print** button
- **Confirmation email** – Sent on booking/confirm-payment via Resend (PRD content: code, QR, details, cancel/reschedule links)

### Customer Dashboard & Post-Auth (PRD 1.3)

- **Post-auth routing** – Customer → dashboard; no reservations → “No reservations yet” + prominent “Book a Lane” pill; staff/manager/admin → staff dashboard
- **Dashboard** – Upcoming bookings preview, link to My Bookings, empty state with “Book a Lane”
- **My Bookings** – Upcoming / past, View Details, Cancel (PENDING), **Modify Booking** (reschedule), **Book Again** on past bookings (pre-fills `/book`), **Print receipt** on booking detail
- **Profile** – First name, last name, email, phone (stored on User); profile page; change password; newsletter opt-in (communication preference)

### Auth & Security

- **Login, register, guest register** – Session, role-based redirect
- **Forgot password** – Email token + `/reset-password?token=...`; token invalidated after use
- **Sign Up** – First name, last name, phone persisted (User model)
- **Manager role** – MANAGER in schema; routes to staff dashboard with manager tools
- **Two-factor authentication** – 2FA setup, verify, disable (Phase 3)

### Staff & Manager

- **Staff dashboard** – Today’s bookings, create booking, check-in, customer search
- **Staff calendar timeline (incremental)** – `/staff/calendar?view=timeline` renders lane/time blocks backed by `GET /api/staff/schedule`, while default month view remains unchanged when `view` is absent
- **Staff QA scaffolding** – iPad/touch validation checklist in [`docs/IPAD_QA_CHECKLIST.md`](docs/IPAD_QA_CHECKLIST.md) and stable `data-testid` hooks on key staff surfaces
- **Manager** – Price overrides with reason codes, edit booking, pending-approval workflow, audit log view
- **Recurring lane blocks** – Schema + admin UI; generate occurrences
- **Reports** – Bookings/revenue by date range; CSV export

### Admin & Config

- **Operating hours** – Per day, open/close, “copy to all”, closed
- **Special hours** – Table + admin UI for date overrides; availability uses them
- **Lane blocks** – One-time and recurring; admin UI
- **Packages & products** – CRUD; type, price, isActive
- **Discount codes (promo / corporate)** – `DiscountCode` model; customer preview on `/book`; staff can list at `/staff/settings/discount-codes`; `ADMIN` creates/edits (same data at `/admin/discount-codes`); APIs under `app/api/staff/discount-codes`, `app/api/admin/discount-codes`
- **Audit log** – Table + logging; staff/manager view
- **Settings** – Key/value (e.g. branding, email from)

### Other

- **Wait list** – Join when full; claim link with token; notify when spot opens (email/SMS)
- **SMS reminders** – Twilio (e.g. 24h reminder cron)
- **Customer tier** – User.tier (e.g. REGULAR, VIP); tier discount
- **Mailchimp** – Optional integration for marketing

---

## 🔴 Remaining Gaps vs. PRD

### 1. Customer Experience (Nice-to-have)

| PRD Requirement                                                                  | Current State                                                                                                                                                                                                              | Gap  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **View Receipt (PDF)** – Download receipt as PDF from booking history            | **Done** – "Download PDF" on booking detail; GET `/api/bookings/[id]/receipt` returns PDF (jspdf). Print receipt still available.                                                                                          | None |
| **Communication preferences** – Per-channel toggles (reminders, SMS, promotions) | **Done** – Profile "Communication preferences": Email promotions (newsletter), Email reminders, SMS reminders, SMS promotions. User: `emailReminders`, `smsReminders`, `smsPromotions`; PATCH `/api/auth/me` accepts them. | None |

### 2. Package Management (Admin)

| PRD Requirement                                                                                                                   | Current State                                                                                                                                                                                                                                 | Gap  |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **Package fields** – Image, duration, base guest count, max capacity, price per extra guest, extra lanes, featured, display order | **Done** – Package model: `imageUrl`, `durationMinutes`, `baseGuestCount`, `maxCapacity`, `pricePerExtraGuest`, `pricePerExtraLane`, `featured`, `displayOrder`. Admin Create/Edit package forms include all; list ordered by `displayOrder`. | None |

### 3. Phase 3 (Complete)

| Item                                  | Status                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile app or PWA                     | **Done** – PWA (manifest, installable, Add to Home Screen); start URL `/book`. Native iOS/Android app is out of scope; PWA covers installable experience.                |
| Advanced marketing automation         | **Done** – Post-visit (24h), lapsed-customer (30 days) campaigns; `/api/cron/marketing-automation`; admin Marketing segment counts.                                      |
| Loyalty program                       | **Done** – Points per spend, tiers (Bronze/Silver/Gold), redeem at checkout; dashboard card; Step 4 “Use points”.                                                        |
| Gift cards                            | **Done** – Purchase (Stripe), validate, redeem at Step 4; `/gift-cards` purchase page.                                                                                   |
| API for third-party integrations      | **Done** – Partner API v1 (API key auth), availability + bookings; admin API Keys; OpenAPI spec at `/api/v1/openapi`.                                                    |
| Lane management / POS integration     | **Done** – Stub + `docs/POS_INTEGRATION.md`; `GET /api/admin/pos-export` (501 until vendor chosen).                                                                      |
| Self-service check-in kiosks          | **Done** – `/kiosk/check-in` (fullscreen, QR/code); `Booking.checkInToken`; `/api/kiosk/check-in`.                                                                       |
| Advanced analytics (e.g. AI insights) | **Done** – Staff Analytics: revenue by day, bookings by hour, no-show rate, peak day, avg revenue/day; Insights card with peak hour and summary (see Staff → Analytics). |

---

## 📋 Suggested Priority (Remaining)

**If continuing from current state:**

1. **View Receipt (PDF)** – Done. Download PDF on booking detail; API returns PDF via jspdf.
2. **Package extensions** – Done. Schema + admin UI for image, duration, guest count, capacity, extra guest/lane pricing, featured, display order.
3. **Phase 3** – Complete. All Phase 3 items are implemented (see table above). Optional future: deeper AI/ML insights (e.g. demand forecasting), native mobile app.
4. **Communication preferences** – Done. Profile section with email/SMS toggles for reminders and promotions.

---

## 🔧 Done (was Quick Wins)

- **Book Again** – On past booking card, links to `/book` with `?date=...&time=...&duration=...&numLanes=...`. ✓
- **Print receipt** – On booking detail, “Print receipt” triggers `window.print()`; `.no-print` hides nav/buttons when printing. ✓
- **Modify Booking** – Booking detail shows “Modify Booking” (links to reschedule flow). ✓

---

_Last updated to match bowling-prd.md and IMPLEMENTATION_PHASES.md. Phase 1, 2, and 3 are complete; remaining work is optional polish (e.g. View Receipt PDF, package fields)._
