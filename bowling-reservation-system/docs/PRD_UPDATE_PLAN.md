# PRD Update Plan – Aligned with Business Logic

This document plans **phased updates to bowling-prd.md** so the PRD stays aligned with major business logic and the current product experience. Use it to decide what to change in the PRD and in what order.

**Phase A** (align PRD with current business logic) and **Phase B** (optional tidy) have been applied — see PRD version 1.3 and Document History in `bowling-prd.md`.

---

## Summary of Major Business Logic vs PRD

| Area | Current behavior | PRD today | Action |
|------|------------------|-----------|--------|
| **Customer booking step order** | 1 Date/Time → 2 Packages → 3 Booking details → 4 Review & payment → 5 Confirmation | Matches (§1.3) | None |
| **Step 4 guest experience** | Create Your Account card: guest form only (no “Checkout options” / “Sign In” / “Or continue as guest” block) | PRD doesn’t specify removal | Phase A: Clarify guest path |
| **Pricing rules** | Single source: default settings (lane, bowler, shoe, tax). Staff “Custom pricing rules” UI is **not persisted**; only default is applied to bookings | PRD §3.3 / §10.6 don’t state this | Phase A: Document pricing model |
| **Special hours** | Admin-only (`/admin/special-hours`). No staff settings page for special hours | §3.3 describes feature; §2.7 doesn’t say admin-only | Phase A: Clarify ownership |
| **Staff create booking** | 4 steps: Customer → Date & time → Details (bowlers, shoes, packages) → Review (with **price breakdown**). Booking created as CONFIRMED; no in-flow “pay on arrival” / “paid cash” options | §2.3 lists payment options (pay now, pay on arrival, paid cash, manager discount) | Phase A: Align flow + payment |
| **Staff settings packages** | View/list in staff settings; create/edit via **Admin** (`/admin/packages/*`) | §10.8 “route-intercept modals” could imply in-staff UX | Phase A: Clarify staff vs admin |
| **Reports / Analytics** | Dedicated pages for `/staff/reports` and `/staff/analytics` | Matches §3.4 | None |
| **Phase 1–3 scope** | Implemented per IMPLEMENTATION_PHASES.md and PRD_GAP_ANALYSIS | PRD MVP and phases are broad | Phase B: Optional PRD tidy |

---

## Phase A: Align PRD with Current Business Logic (Priority)

**Goal:** Update the PRD so it accurately describes how the system works today. No new product scope; documentation only.

### A.1 Pricing model and staff pricing settings

**Change:**

- In **§10.6 Pricing** (and anywhere “custom pricing rules” appear):
  - State that **only default pricing** (lane rental per hour, price per bowler, shoe rental, tax rate) is stored and applied to all booking calculations.
  - State that **custom pricing rules** (e.g. by day/time) may be shown in the staff Pricing UI for reference or future use but are **not persisted or applied** until backend support exists.
- Optionally add a short “Pricing model” subsection under Core Features or Technical Architecture:
  - Single source of truth: settings (DB). Used by customer booking API, staff booking API, and any price preview (e.g. staff create booking step 4).

**Rationale:** Avoids confusion and sets correct expectations for staff and for future custom-rules work.

---

### A.2 Special hours ownership

**Change:**

- In **§3.3 Operating Hours Management – Special Hours / Overrides** (and §2.7 if special hours are listed):
  - Explicitly state that **special hours** (date-specific overrides) are configured in **Admin** only (e.g. `/admin/special-hours`). Staff settings do not include a special hours screen; staff can view operating hours but not special overrides.
- Remove or correct any staff-side reference to “special hours” in staff settings (e.g. in §2.0 or §2.7) so it’s clear there is no `/staff/settings/special-hours`.

**Rationale:** Matches implementation; staff header/titles no longer reference a non-existent staff special-hours page.

---

### A.3 Staff create booking flow and payment

**Change:**

- In **§2.3 Create Booking (Staff)**:
  - Describe the **actual 4-step flow**: (1) Customer search/selection, (2) Date & time (and duration), (3) Booking details (bowlers, shoe sizes, optional lane, packages), (4) Review with **itemized price breakdown** (lane, bowlers, shoes, packages, tax, total) and “Create Booking.” No payment collection in the create flow.
  - State that the **price breakdown in step 4** uses the same pricing settings as the booking API so staff see the exact total before creating.
  - Under **Payment options**, align with current behavior:
    - **Current:** Staff create booking creates a CONFIRMED booking with a total; payment is not collected in the create flow. Options such as “pay on arrival” or “mark as paid (cash)” can be reflected later (e.g. at check-in or via booking detail actions), not as choices during create.
    - **PRD update:** Either (a) state that “Create Booking” creates a confirmed booking and payment is handled separately (e.g. at check-in or on booking detail), with future option to add “Pay on arrival” / “Paid (cash)” at create time, or (b) add a short “Future: payment method at create” note and keep the existing payment options as target behavior for a later phase.

**Rationale:** PRD currently implies payment method selection during staff create; the app doesn’t. Aligning avoids misinterpretation and supports prioritization of payment-at-create if desired.

---

### A.4 Step 4 – Guest checkout experience

**Change:**

- In **§1.3 Step 4: Review & Payment** (and any detailed step 4 description):
  - For the **Create Your Account** card when the user is not signed in:
    - State that the guest path shows the **guest form only** (name, email, phone, “Continue as Guest”) without a separate “Checkout options” block (no “Sign In to Existing Account” button or “Or continue as guest” divider above the form). Sign-in remains available via the header.

**Rationale:** Matches the simplified guest experience implemented in the app.

---

### A.5 Staff settings – Packages (10.8)

**Change:**

- In **§10.8 Packages**:
  - State that staff **view** packages in Settings (list/filter). **Create and edit** packages are done in **Admin** (e.g. `/admin/packages`, `/admin/packages/create`); staff “Add Package” (or equivalent) links to the admin area. Route-intercept modals for package create/edit apply to the admin package list, not necessarily to the staff settings package list.

**Rationale:** Matches current UX (staff settings packages → admin for create/edit).

---

## Phase B: Optional PRD Tidy and Consistency

**Goal:** Small clarifications and consistency passes. No new features.

### B.1 MVP / Phase scope summary

- Add a short “Current implementation status” or “As-built alignment” note (e.g. in MVP Scope or Implementation Timeline) that points to **IMPLEMENTATION_PHASES.md** and **PRD_GAP_ANALYSIS.md** for what is done in Phase 1–3 and what (if anything) remains. This keeps the PRD as the source of truth for *requirements* while pointing to other docs for *status*.

### B.2 Terminology

- Use “default pricing” and “custom pricing rules” consistently where pricing is described (e.g. §10.6, §3.x, Technical Architecture).
- Use “special hours” only for date-specific overrides; “operating hours” for regular weekly schedule. Clarify “admin only” for special hours wherever they’re mentioned.

### B.3 Document history

- After applying Phase A (and optionally B), bump PRD version and add a row to Document History, e.g.: “1.2 – [Date] – PRD aligned with current business logic (pricing model, special hours ownership, staff create booking flow and payment, guest step 4, staff packages 10.8). See docs/PRD_UPDATE_PLAN.md.”

---

## Phase C: Future PRD Changes (When Product Changes)

**Goal:** When you add new business logic, update the PRD in the same release.

### C.1 When custom pricing rules are implemented

- Add backend/data model for custom rules (e.g. by day of week and time range).
- Update §10.6 and any “Pricing model” section to state that both default and custom rules are stored and applied (with clear precedence rules).
- Update staff create booking (and customer flow) to mention use of applicable rule when displaying or calculating price.

### C.2 When staff create booking gets payment-at-create options

- Add to §2.3: “Pay on arrival,” “Paid (cash),” “Process payment now” (if applicable), with acceptance criteria and any new booking statuses or fields.
- Optionally add a short payment state model (e.g. unpaid vs pay-on-arrival vs paid) to Technical Architecture or schema appendix.

### C.3 When special hours are exposed to staff

- If staff get a read-only or edit view for special hours, add a subsection under §2.7 (or §3.3) and clarify which roles can view/edit. Add `/staff/settings/special-hours` (or equivalent) to the staff navigation/title map in the PRD.

---

## Suggested order of work

1. **Phase A** – Do all of A.1–A.5 so the PRD matches current behavior. This is the minimum for “aligned with major business logic.”
2. **Phase B** – Optional; do when doing a broader PRD review or before a stakeholder sign-off.
3. **Phase C** – Apply when implementing the corresponding product changes (custom rules, staff payment options, staff special hours).

---

## Quick reference: where to edit bowling-prd.md

| Phase | Section(s) to update |
|-------|----------------------|
| A.1   | §10.6 Pricing; optionally new “Pricing model” under §5 or Technical Architecture |
| A.2   | §3.3 Special Hours; §2.7 Staff Settings (remove/align staff special hours) |
| A.3   | §2.3 Create Booking (Staff) – flow steps + payment options |
| A.4   | §1.3 Step 4 – Create Your Account / guest path |
| A.5   | §10.8 Packages |
| B.1   | MVP Scope or Implementation Timeline |
| B.2   | §10.6, §3.x, any “special hours” / “operating hours” mentions |
| B.3   | Document History (and version number) |

---

*This plan is part of the bowling reservation system docs. Update it when new business logic diverges from the PRD so the next PRD update stays phased and aligned.*
