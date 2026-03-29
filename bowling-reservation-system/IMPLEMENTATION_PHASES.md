# Implementation Phases

Aligned with **bowling-prd.md** MVP scope and **PRD_GAP_ANALYSIS.md**. Work through phases in order.

---

## Phase 1: Core MVP (Months 1–3)

**Goal:** Close gaps so the app matches PRD Phase 1 must-haves.

### 1.1 Customer experience (quick wins)
- [x] **Dashboard empty state** – When customer has no upcoming bookings: show “No reservations yet” and a prominent “Book a Lane” pill (gradient CTA).
- [x] **Dashboard with upcoming preview** – Show next 1–5 upcoming bookings on dashboard with View Details and link to My Bookings.
- [x] **Terms & conditions** – Step 4: add “I agree to the terms and conditions” checkbox; disable Complete Booking until checked. Stub `/terms` page added.
- [x] **Print confirmation** – Confirmation page: add “Print” button (`window.print()`).

### 1.2 Payment & booking completion
- [x] **Stripe integration** – Step 4: collect payment (card; optional Apple/Google Pay) before completing booking; support full payment (deposit can be Phase 2).
- [x] **Terms acceptance** – Already in 1.1; ensure it’s required in API when creating booking.

### 1.3 Confirmation & email
- [x] **Confirmation email** – On booking creation (no Stripe) or on confirm-payment (Stripe): send email via Resend with PRD content.
- [x] **Email config** – RESEND_API_KEY + EMAIL_FROM; no-op if not set.

### 1.4 Profile & auth
- [x] **Customer profile data** – User: firstName, lastName, phone; collected on register and guest checkout.
- [x] **Profile page** – Basic profile editing: name, email, phone; optional “Change password”; header uses `AppExperienceHeader` (booking variant) with Profile link.
- [x] **Forgot password** – /forgot-password → email link; /reset-password?token=... → set new password; token invalidated. PasswordResetToken + Resend.

### 1.5 Staff & manager (MVP)
- [x] **Manager role** – Add MANAGER to schema (or treat STAFF with “manager” flag); route Manager to same staff dashboard with extra actions.
- [x] **Price override** – Staff/manager: override booking total with required reason code (dropdown) and notes; log in DB (audit_logs or booking history).
- [x] **Recurring lane blocks** – Schema + admin UI: create block with recurrence (e.g. weekly/bi-weekly); generate or query occurrences.
- [x] **Basic reports** – Staff/manager: simple bookings list and revenue by date range; optional CSV export.

### 1.6 Admin & config
- [x] **Operating hours** – Admin: “Copy to all days”, per-day closed checkbox, save; already have operating_hours table.
- [x] **Special hours** – Add special_hours table (date, open, close, closed); admin UI to add overrides; availability logic uses special_hours when present.
- [x] **Audit log** – Add audit_logs table; log staff/manager/admin actions (override, refund, edit booking, etc.); optional read-only view for managers.

### Phase 1 checklist (summary)
- [x] Dashboard empty state + “Book a Lane” CTA
- [x] Terms checkbox on Step 4
- [x] Print on confirmation page
- [x] Stripe payment at Step 4
- [x] Confirmation email on booking
- [x] Profile storage (name, phone) + profile page
- [x] Forgot password flow
- [x] Manager role + price override with reason codes
- [x] Recurring lane blocks
- [x] Operating hours “copy to all” / closed
- [x] Special hours table + admin UI
- [x] Audit log table + logging + view

---

## Phase 2: Enhanced (Months 4–6)

**Goal:** PRD Phase 2 features.

- [x] Multiple lane booking (single booking, multiple lanes)
- [x] Wait list when slot full + notification when spot opens
- [x] SMS reminders (e.g. Twilio)
- [x] Customer self-service booking modifications (reschedule/cancel with rules)
- [x] Arcade card add-on during booking
- [x] Individual food/drink item selection (if applicable)
- [x] Enhanced reporting and analytics
- [x] Manager approval workflows (e.g. discount approval)
- [x] Customer tier (e.g. VIP, Regular) and benefits
- [x] Mailchimp (or similar) integration for marketing

---

## Phase 3: Advanced (Months 7–12)

**Goal:** PRD Phase 3 features.

- [x] Two-factor authentication
- [x] **Progressive web app (PWA)** – Web app manifest (`/manifest.json`), theme color, installable (Add to Home Screen). Generated icons at `/icon/192` and `/icon/512`. Start URL `/book`, standalone display.
- [x] **Advanced marketing automation** – Triggered campaigns: post-visit email (24h after completed booking), lapsed-customer email (no booking in 30 days, newsletter opt-in, throttled 28 days). Cron `/api/cron/marketing-automation`; admin Marketing page for segment counts. Builds on Resend/Twilio.
- [x] **Loyalty program** – Points per visit/spend (1 pt/$1), tiers (Bronze/Silver/Gold), redeem 100 pts = $5 off. Schema: `User.loyaltyPoints`, `LoyaltyTransaction`; dashboard card; Step 4 “Use points” + redemption at confirm-payment. Run `npx prisma db push` to apply.
- [x] **Gift cards** – Purchase (Stripe) and redeem at checkout. Schema: `GiftCard` (code, balance, status); `/api/gift-cards/validate`, `purchase`, `confirm`; Step 4 “Gift card” code + amount; dashboard “Buy gift card” → `/gift-cards`. Run `npx prisma db push` to apply.
- [x] **API for third-party integrations** – Partner API (v1): API key auth (`X-API-Key` or `Bearer`), scopes (availability, bookings:read, bookings:write). GET /api/v1/availability, GET/POST /api/v1/bookings. Admin: API Keys page + POST/GET /api/admin/api-keys. OpenAPI spec at /api/v1/openapi. Run `npx prisma db push` to apply.
- [x] **Integration with lane management / POS** – Stub and docs: `docs/POS_INTEGRATION.md`, `GET /api/admin/pos-export` returns 501 until vendor format chosen. Implement export/webhook when vendor API is selected.
- [x] **Self-service check-in kiosks** – Kiosk UI at `/kiosk/check-in` (fullscreen, large touch). QR or enter confirmation code; token-based or booking-id API; confirmation page QR encodes kiosk URL. Schema: `Booking.checkInToken`; `/api/kiosk/check-in` GET/POST; public route.
- [x] **Advanced analytics** – Staff Analytics page: revenue by day, bookings by hour, no-show rate (past PAID/CONFIRMED vs showed), peak day, avg revenue/day. API: `GET /api/staff/analytics?days=30`. CSV export remains in Reports.

**Suggested order for remaining Phase 3:** (1) Loyalty or Gift cards (revenue/engagement), (2) Public API (if partners need it), (3) Marketing automation, (4) Kiosks (UX), (5) POS integration (vendor-dependent), (6) Advanced analytics.

---

## Next step

**Phase 1**, **Phase 2**, and **Phase 3** are complete.

**Phase 3 (all done):** 2FA, PWA, marketing automation, loyalty, gift cards, partner API, POS stub, kiosks, advanced analytics (including Insights card: peak day, peak hour, weekend share, no-show suggestion). PRD_GAP_ANALYSIS.md updated to mark Phase 3 as implemented.

**Optional polish:** All done. View Receipt as PDF (jspdf + Download button on booking detail), package fields (image, duration, capacity, extra guest/lane pricing, featured, display order in admin), communication toggles (profile: email reminders, SMS reminders, SMS promotions).

---

## How to use this doc

1. **Phase 1:** Work through sections 1.1 → 1.6 in order; check off items as done.
2. **PRD_GAP_ANALYSIS.md** – Use for detailed gap descriptions and quick wins.
3. **bowling-prd.md** – Authority for acceptance criteria and copy.
4. Update this file when you add or move scope (e.g. “deposit” from Phase 2 into Phase 1).
