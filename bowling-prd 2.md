# Bowling Alley Reservation System
## Product Requirements Document (PRD)

**Version:** 1.1  
**Last Updated:** February 2026  
**Document Owner:** Bradly Zavakos  
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Goals & Objectives](#business-goals--objectives)
3. [User Personas](#user-personas)
4. [Core Features & Requirements](#core-features--requirements)
5. [Technical Architecture](#technical-architecture)
6. [Security & Compliance](#security--compliance)
7. [MVP Scope](#mvp-scope)
8. [Future Enhancements](#future-enhancements)
9. [Success Metrics](#success-metrics)
10. [Implementation Timeline](#implementation-timeline)
11. [Appendices](#appendices)

---

## Executive Summary

### Product Overview
A comprehensive online reservation system for our family bowling alley that enables customers to book lanes 24/7 and allows staff to efficiently manage bookings, schedules, and customer relationships.

### Problem Statement
Currently, customers must call or visit in person to book lanes, creating friction in the booking process and tying up staff time that could be better spent on in-person customer service. There's no unified system for managing customer information across different touchpoints (bowling, arcade, food service).

### Solution
A web-based reservation platform with:
- Customer self-service booking with online payment
- Staff dashboard for walk-in bookings and schedule management
- Manager tools for pricing overrides and reports
- Unified customer database with marketing capabilities
- Flexible package system for parties and events

### Expected Outcomes
- **For Customers:** Book anytime, anywhere with instant confirmation
- **For Staff:** Less time on phones, more time creating great experiences
- **For Business:** Capture after-hours bookings, reduce no-shows, improve customer insights

---

## Business Goals & Objectives

### Primary Goals

1. **Increase Booking Efficiency**
   - Enable 24/7 online booking availability
   - Reduce phone call volume by 60%
   - Decrease booking time from 5+ minutes to under 2 minutes

2. **Improve Customer Experience**
   - Provide instant booking confirmation
   - Send automated reminders to reduce no-shows
   - Allow self-service account management

3. **Optimize Staff Productivity**
   - Free staff from phone duties for in-person service
   - Provide efficient tools for walk-in booking (under 1 minute)
   - Centralize customer information for better service

4. **Increase Revenue**
   - Capture bookings during closed hours
   - Reduce no-shows through deposits and reminders
   - Enable targeted marketing campaigns
   - Better utilize off-peak time slots

5. **Gain Customer Insights**
   - Unified customer database across all services
   - Understand booking patterns and preferences
   - Identify VIP customers and lapsed customers
   - Track marketing campaign effectiveness

### Key Performance Indicators (KPIs)

**Adoption Metrics:**
- % of bookings made online vs. phone/walk-in
- Number of new customer accounts created
- Mobile vs. desktop booking ratio

**Efficiency Metrics:**
- Average time to complete booking (customer & staff)
- Phone call volume reduction
- Staff time allocation (booking vs. service)

**Financial Metrics:**
- Online booking revenue
- After-hours booking capture
- No-show rate reduction
- Average booking value
- Package attachment rate

**Customer Metrics:**
- Customer satisfaction score
- Repeat booking rate
- Customer lifetime value
- Marketing email open/click rates

---

## User Personas

### Persona 1: Sarah - The Parent Planner
**Demographics:** 35 years old, married with 2 kids (ages 7 and 9)  
**Tech Savvy:** Moderate (uses smartphone for everything)  
**Booking Frequency:** Monthly, mostly for birthday parties

**Goals:**
- Book birthday parties easily
- Find packages that include everything
- Book during evening hours (after work)
- Manage booking from her phone

**Pain Points:**
- Can't call during business hours (she's working)
- Needs to know exact pricing upfront
- Wants confirmation she can reference later
- Worried about no-show fees

**User Story:**
> "As a working parent, I want to book birthday party packages from my phone in the evening so that I can plan my child's party without taking time during my workday."

---

### Persona 2: Mike - The League Bowler
**Demographics:** 28 years old, single  
**Tech Savvy:** High  
**Booking Frequency:** Weekly (league) + occasional social bowling

**Goals:**
- Quick booking for social outings
- See his booking history
- Get reminders before his booking
- Easy check-in process

**Pain Points:**
- Wants to book last-minute (tonight)
- Doesn't want to talk to anyone
- Needs speed and efficiency

**User Story:**
> "As a regular bowler, I want to quickly book a lane for tonight without calling anyone so that I can bowl with friends spontaneously."

---

### Persona 3: Jessica - The Corporate Event Coordinator
**Demographics:** 42 years old, works for local company  
**Tech Savvy:** Moderate  
**Booking Frequency:** Quarterly (company events)

**Goals:**
- Book large groups (20-30+ people)
- Need multiple packages
- Want itemized pricing
- Require invoices for reimbursement

**Pain Points:**
- Complex bookings (multiple lanes, food, arcade)
- Needs approval before booking
- Requires detailed receipts
- May need to modify bookings

**User Story:**
> "As a corporate event planner, I want to book multiple packages and lanes for our team outing so that I can create a fun experience within our budget."

---

### Persona 4: Tom - Front Desk Staff
**Demographics:** 22 years old, part-time employee  
**Tech Savvy:** High  
**Role:** Basic Staff

**Goals:**
- Quickly check in arriving customers
- Create bookings for walk-ins fast
- Look up customer information
- Focus on customer service, not paperwork

**Pain Points:**
- Current system is slow
- Hard to find customer information
- Answering same questions repeatedly
- Can't override pricing (needs manager)

**User Story:**
> "As front desk staff, I want to create bookings for walk-in customers in under a minute so that I can get them bowling quickly and serve other customers."

---

### Persona 5: Linda - General Manager
**Demographics:** 45 years old, 10 years with company  
**Tech Savvy:** Moderate  
**Role:** Manager

**Goals:**
- Understand business performance
- Handle customer service issues
- Adjust pricing for special situations
- Plan staffing and lane usage
- Market to bring back lapsed customers

**Pain Points:**
- No visibility into booking patterns
- Can't easily identify VIP customers
- Manual report creation
- No way to track why overrides happen

**User Story:**
> "As a manager, I want to see booking patterns and customer data so that I can make informed decisions about pricing, staffing, and marketing."

---

## Core Features & Requirements

### 1. Customer-Facing Features

#### 1.1 User Registration & Authentication
**Requirements:**
- First name, last name (required)
- Email address (required, becomes username)
- Phone number (required)
- Password with strength requirements:
  - Minimum 8 characters
  - At least one uppercase, one lowercase, one number
- Marketing opt-in checkbox
- Email verification required
- Secure password reset flow

**Acceptance Criteria:**
- Customer can create account in under 2 minutes
- Email verification sent immediately
- Password meets security requirements
- Duplicate email detection

---

#### 1.2 Landing & Booking Entry Point

**On-Load Experience:**
**Requirements:**
- The primary landing page loads directly into Step 1 of the booking flow
- No homepage or marketing landing page before booking begins
- Users can immediately start selecting a date and time without navigation
- Sticky booking header always visible at top of the experience:
  - Bowling alley name (e.g., "StrikeZone Bowling")
  - Address (e.g., "1234 Main St, Brookhaven, GA 30319")
  - Optional: Phone number or contact link
  - "Sign In" link (right-aligned) that opens the authentication modal
  - Header persists through all booking steps so users always know where they are booking

**Sign In Modal (triggered by "Sign In" link in header):**
**Requirements:**
- Modal or overlay that appears on top of current booking flow (does not navigate away)
- Two tabs or toggle at top: "Sign In" and "Sign Up" (default: Sign In)
- Sign In tab:
  - Email field
  - Password field
  - "Forgot password?" text link
  - "Sign In" pill button (primary, gradient)
  - Validation: inline error messages for invalid credentials
- Sign Up tab:
  - First name and last name fields (side by side on desktop, stacked on mobile)
  - Email field
  - Phone number field
  - Password field with strength indicator
  - Confirm password field
  - Marketing opt-in checkbox
  - "I agree to Terms & Privacy Policy" checkbox (required)
  - "Sign Up" pill button (primary, gradient)
  - Validation: inline errors, email format check, password match check
- Smooth transition animation between Sign In and Sign Up tabs
- Close button (X) in top right corner
- Clicking outside modal closes it (preserves booking progress)
- On successful action, modal closes and page updates based on user role (see routing below)

**Post-Authentication Routing:**
**Requirements:**
- Upon successful login or signup, the system checks the user's role and routes accordingly:

  **Customer (new signup or existing customer account):**
  - If the customer has an active or upcoming reservation:
    - Routed to Customer Dashboard showing their current/upcoming bookings
    - Dashboard displays: upcoming reservations, past activity, quick actions
  - If the customer has no reservations (new signup or no history):
    - Routed to Customer Dashboard in an empty state
    - Shows "No reservations yet" message
    - Displays past activity if any exists (previous completed bookings)
    - Prominent "Book a Lane" pill button (gradient, primary CTA) to re-enter booking flow
  - If the customer signed in mid-booking:
    - Their in-progress booking data is preserved
    - They are returned to where they left off in the booking flow with their account now linked

  **Staff (Basic Staff role):**
  - Routed directly to Staff Dashboard
  - Shows: today's bookings, quick actions (create booking, check in customer, search)
  - Does not have access to customer-facing booking flow

  **Manager:**
  - Routed directly to Staff/Manager Dashboard
  - Shows: all staff dashboard features plus manager-specific tools (overrides, reports, lane blocks)
  - Full access to customer management and audit logs

  **Admin:**
  - Routed directly to Staff/Admin Dashboard
  - Shows: full system access including all manager features plus system configuration, package management, staff account management, and export tools

**Acceptance Criteria:**
- Sign In link is visible and accessible in the sticky header at all times
- Modal opens without navigating away from current page
- Switching between Sign In and Sign Up tabs is smooth and preserves any entered data
- Role-based routing happens immediately after successful authentication (< 1 second)
- Customer with no reservations sees a useful empty state (not a blank page)
- Customer who signs in mid-booking can resume their booking seamlessly
- Staff, Manager, and Admin accounts cannot access customer-facing booking flow
- Invalid credentials show clear, helpful error messages
- Signing up creates the account and logs in immediately (no separate login step required)
- Forgot password link opens password reset flow (email-based token)

---

#### 1.3 Lane Booking Flow

**Step 1: Select Date & Time**
**Requirements:**
- Calendar view showing available dates
- Only show times when center is open
- Time slot selection (30-minute increments)
- Visual indicators:
  - Green = Available (8+ lanes)
  - Yellow = Limited (3-7 lanes)
  - Red = Full (0-2 lanes)
  - Gray = Closed
- Wait list option when full
- Duration selector (1, 1.5, 2, 2.5, 3 hours)
- Real-time availability checking

**Acceptance Criteria:**
- Calendar loads in under 2 seconds
- Availability updates in real-time
- Mobile-responsive design
- Clear pricing displayed for selected time

---

**Step 2: Add Packages & Extras**
**Requirements:**
- Browse available packages by category:
  - Party Packages
  - Food & Drink Packages
  - Arcade Cards
  - Other Add-ons
- Each package displays:
  - Image
  - Name and description
  - Base price
  - What's included
  - Duration (if applicable)
  - Capacity (serves X guests)
- Ability to add multiple packages
- Ability to add same package multiple times
- Customize each package:
  - Additional guests (with per-person pricing)
  - Additional lanes (with per-lane pricing)
- Shopping cart/basket view
- Edit/remove packages from cart
- "Skip" option to proceed without packages
- Real-time price calculation

**Acceptance Criteria:**
- Clear package differentiation
- Easy to add multiple packages
- Cart shows itemized breakdown
- Mobile-optimized package cards
- Duration validation (all packages must match booking duration)

---

**Step 3: Booking Details**
**Requirements:**
- Number of bowlers selector (1-10 per lane)
- Shoe rental for each bowler:
  - Shoe size dropdown (whole and half sizes, 1-15)
  - "Own shoes" checkbox option
- Visual summary of selections
- Running price total always visible
- Input validation (max bowlers per lane)

**Acceptance Criteria:**
- Quick input (+ / - buttons)
- Price updates immediately
- Clear "per person" pricing
- Mobile-friendly inputs

---

**Step 4: Review & Payment**
**Requirements:**
- Complete booking summary:
  - Date, time, duration
  - Lane count
  - Bowler count
  - Shoe rentals
  - All packages with details
- Itemized price breakdown:
  - Lane rental
  - Shoe rentals
  - Each package
  - Subtotal
  - Tax
  - Total
- Payment integration:
  - Stripe or Square payment processing
  - PCI-compliant (no card storage)
  - Support for major credit cards
  - Apple Pay / Google Pay support
  - Option for deposit vs. full payment
- Terms and conditions acceptance
- Final "Complete Booking" button

**Acceptance Criteria:**
- Clear, scannable summary
- Trust indicators (secure payment badges)
- Single-action checkout
- Error handling for payment failures
- No duplicate charges

---

**Step 5: Confirmation**
**Requirements:**
- Success confirmation page
- Booking reference number (prominent)
- Complete booking details
- QR code for check-in
- "Add to Calendar" button
- "View My Bookings" link
- Immediate confirmation email sent (see Email Confirmation spec below)
- Option to print receipt

**Acceptance Criteria:**
- Loads immediately after payment
- All details accurate
- Email arrives within 1 minute
- QR code scannable

---

**Confirmation Email Specification:**
**Requirements:**
- Automatically triggered upon successful payment and booking confirmation
- Sent to the email address provided during registration/checkout
- Email must include the following content:
  - Bowling alley name and address
  - Confirmation code (large, prominent, easy to find)
  - QR code (scannable at check-in, encodes the confirmation code)
  - Booking date and time
  - Duration of the booking
  - Lane number(s) assigned (or "Lane assignment at check-in" if not yet assigned)
  - Party size (number of bowlers)
  - Customer first name and last name
  - Customer phone number on file
  - Packages or add-ons included (if any)
  - Total amount paid and payment method
  - Cancellation link (functional or stub for v1 that directs to account or support)
  - Reschedule link (functional or stub for v1 that directs to account or support)
  - Bowling alley contact information (phone, address, hours)
- Email design:
  - Clean, branded layout matching the app's visual style
  - Mobile-responsive (renders well on phone email clients)
  - Clear visual hierarchy: confirmation code and QR code at the top
  - Subtle use of brand colors (gradient accents, not overwhelming)
  - Plain text fallback version included for email clients that don't render HTML
- Email delivery:
  - Sent via configured email service (SendGrid, Mailgun, or AWS SES)
  - Delivery confirmation tracked in system
  - Failed delivery flagged for retry (up to 3 attempts)
  - If all retries fail, log error and flag booking for staff follow-up

**Email Layout Structure (top to bottom):**
1. Bowling alley logo and name
2. "Your Booking is Confirmed!" headline
3. Confirmation code (large, bold, inside a bordered box)
4. QR code (centered, scannable)
5. Booking details section:
   - Date & Time
   - Duration
   - Lane(s)
   - Party Size
   - Bowler Name & Phone
   - Packages/Add-ons (if any)
6. Payment summary (total paid, method)
7. Manage Your Booking section:
   - Cancel this booking (link)
   - Reschedule this booking (link)
8. Need help? Contact us section
9. Footer: address, hours, social links

**Acceptance Criteria:**
- Email sends within 60 seconds of booking confirmation
- All required fields populated correctly
- QR code is scannable and resolves to the correct booking
- Cancellation and reschedule links are present (functional or stub)
- Email renders correctly on Gmail, Apple Mail, Outlook, and mobile email clients
- Plain text version is included
- Failed deliveries are logged and retried
- Staff can see delivery status in booking record

---

#### 1.3 Customer Dashboard & Account Management

**My Bookings View:**
**Requirements:**
- Upcoming bookings section:
  - Date, time, lane info
  - Package details
  - "View Details" button
  - "Modify Booking" button (if allowed)
  - "Cancel Booking" button
- Past bookings section (collapsed by default)
- Booking status indicators:
  - Confirmed
  - Checked In
  - Completed
  - Cancelled

**Acceptance Criteria:**
- Bookings sorted by date (nearest first)
- Quick access to booking details
- Clear status indicators
- Past bookings easily accessible

---

**Profile Management:**
**Requirements:**
- Edit personal information:
  - First name, last name
  - Email (requires re-verification)
  - Phone number
  - Birthday (optional)
  - Address (optional)
- Change password:
  - Require current password
  - New password validation
  - Confirm new password
- Communication preferences:
  - Email: confirmations (required), reminders, promotions, newsletter
  - SMS: reminders, promotions
  - Preferred contact method
- Saved payment methods (via Stripe/Square)
- View account creation date
- View total bookings

**Acceptance Criteria:**
- Easy to update information
- Immediate save confirmation
- Email change requires verification
- Password change invalidates other sessions

---

**Booking History:**
**Requirements:**
- List of all past bookings
- Show: date, booking details, total paid
- "View Receipt" button
- "Book Again" quick action
- Pagination or infinite scroll
- Filter options (date range, status)

**Acceptance Criteria:**
- Fast loading (paginated)
- Receipts downloadable as PDF
- "Book Again" pre-fills similar booking

---

#### 1.4 Wait List Functionality

**Requirements:**
- Join wait list when time slot full
- Provide email and phone for notifications
- Automated notification when spot opens:
  - Email + SMS (if opted in)
  - Time-limited claim (15 minutes)
  - Direct link to book
- Auto-remove from wait list after:
  - Successfully claiming spot
  - Declining spot
  - Time limit expires
  - Date passes
- View wait list status in account

**Acceptance Criteria:**
- One-click join wait list
- Notification sent within 1 minute of opening
- Clear countdown timer to claim
- Easy claim process

---

### 2. Staff Features

#### 2.0 Employee Login State & Internal Experience

**Unified internal UI**
- All internal roles (Staff, Manager, Admin) see the same visual framework: staff dashboard, same top bar, same settings/reports/calendar structure. Role controls only what the user can edit (e.g. read-only settings for Staff, full edit for Admin); the layout and navigation are identical.

**Post-login routing**
- Staff, Manager, and Admin are routed to the staff dashboard (`/staff`) after login. Customers are routed to the customer dashboard (`/dashboard`). "My Bookings" / dashboard links elsewhere in the app respect role (staff → `/staff`, customer → `/dashboard`).

**Top navigation (when not on an immersive subpage)**
- Header shows: StrikeZone brand (left), then right-aligned: notification button (optional), Settings link, user name, role label, initials avatar. No date in the main nav. No sign-out in the top bar; sign-out is only on the Settings page (see below).

**Immersive subpages (Settings, Reports, Calendar)**
- These pages use a full-bleed gradient header and "take over" the screen: the main top nav is hidden. Header includes: "Back to Dashboard" (left), and on the right the same user block (name, role, initials). Button text uses `whitespace-nowrap` so labels do not wrap. Sign-out is not in this header; it lives on the Settings sidebar only.

**Sign-out**
- Sign-out is a red button below all settings links in the Settings sidebar (e.g. below Account Information, User Management, … Packages). It is not in the main dashboard nav or the immersive header.

**Dashboard (staff home)**
- Gradient hero with KPI cards (e.g. Bookings today, Available lanes, Checking in soon, Revenue today) and pill-style CTAs: New booking, Reporting, Calendar. Table "Today's schedule" with columns: Time (12-hour AM/PM), Customer (first and last name, with email fallback), Lanes, Status, Actions. Row actions are in a popover opened by a vertical-ellipsis button (Details, Edit Reservation, Check In where applicable). Search and status filter; customer search includes name and email.

**Settings**
- Single list of items (10.1 Account Information through 10.8 Packages); no "Advanced" grouping. Sidebar nav; each section in the content area. Sign-out button at bottom of sidebar (red). Full-bleed gradient header with Back to Dashboard and user block.

**Reports & Analytics**
- Single canonical page at `/staff/reports`. Path `/staff/analytics` redirects to `/staff/reports`. Tabs: Analytics, Contacts. Date range pills (Today, This Week, This Month, This Year, Custom Range) and Export Report in the same control row (no wrap). Analytics tab: KPI cards, Quick Metrics (icon-led rows: Average Party Size, Lane Utilization, Peak Hours), Top Packages (ranked rows with number badges and revenue), Daily Revenue and Daily Bookings bar chart sections with axis and labels.

**Calendar**
- Dedicated page at `/staff/calendar`: month grid and side panel for selected day’s bookings. All "Calendar" links point to `/staff/calendar`.

**Modals**
- Booking details from the dashboard table open in a modal (route-intercept or overlay). Package create/edit use route-intercept modals; primary nav remains the package list.

**Acceptance criteria**
- Staff/Manager/Admin see the same shell and nav; only edit permissions differ by role.
- Sign-out appears only in Settings sidebar (red button), not in main or immersive header.
- Subpages (Settings, Reports, Calendar) use full-bleed header and hide main nav; Back to Dashboard and user block present.
- Customer column shows first and last name with email fallback; search includes name.
- Reports and calendar match the above structure and links.

---

#### 2.1 Staff Authentication & Roles

**User Roles:**

**Basic Staff:**
- Create bookings for walk-ins
- View all bookings
- Search customers
- Check in customers
- View customer booking history
- Process standard payments

**Manager:**
- All Basic Staff permissions
- Edit existing bookings
- Override pricing
- Apply discounts
- Process refunds
- Cancel bookings (waive fees)
- Override calendar blocks
- Access reports
- Manage basic staff accounts
- View audit logs

**Admin:**
- All Manager permissions
- Manage all staff accounts
- Configure system settings
- Manage packages
- Configure operating hours
- Set up lane blocks
- Export customer data
- Configure integrations
- Full audit log access

**Requirements:**
- Staff login separate from customer login
- Role-based permissions enforced
- Session timeout after inactivity
- Audit logging for all actions

**Acceptance Criteria:**
- Staff cannot access customer portal
- Permissions properly enforced
- Failed login attempts logged
- Session security maintained

---

#### 2.2 Staff Dashboard

**Requirements:**
- See **§2.0 Employee Login State & Internal Experience** for layout, nav, and sign-out placement. Dashboard is the staff home after login.
- Gradient hero with key metrics (KPI) cards:
  - Bookings today
  - Available lanes (right now)
  - Checking in soon (e.g. next 30 minutes)
  - Revenue (e.g. today)
- Pill-style CTAs in hero: New booking, Reporting (→ `/staff/reports`), Calendar (→ `/staff/calendar`).
- **Today's schedule** table:
  - Columns: Time (12-hour), Customer (first and last name; fallback to email), Lanes, Status, Actions.
  - Row actions via popover (vertical-ellipsis): Details (opens booking details modal), Edit Reservation, Check In where applicable.
  - Search (customer name/email) and status filter.
- Optional: date selector (default today); notifications/alerts (upcoming, no-shows, system messages).

**Acceptance Criteria:**
- Dashboard loads in under 2 seconds.
- Real-time or periodic refresh (e.g. every 30 seconds).
- Touch-friendly for tablets; clear visual hierarchy.
- Customer names shown as first/last with email fallback; actions in popover.

---

#### 2.3 Create Booking (Staff)

**Requirements:**
- Customer search/selection:
  - Search by name, phone, email
  - Quick results
  - "Create New Customer" option
  - Show customer history when selected
- Streamlined booking flow:
  - Date/time/lane selection
  - Duration
  - Bowlers and shoe sizes
  - Add packages (same as customer flow)
  - Customize packages
- Payment options:
  - Process payment now (card present)
  - Process payment now (card not present)
  - Mark as "pay on arrival"
  - Mark as "paid - cash"
  - Manager discount option
- Quick confirmation
- Print option for customer

**Acceptance Criteria:**
- Complete walk-in booking in under 1 minute
- Customer search fast (< 1 second)
- Large touch targets
- Keyboard shortcuts supported
- Auto-print receipt option

---

#### 2.4 Customer Search & Management

**Requirements:**
- Search functionality:
  - By name (first or last)
  - By phone number
  - By email
  - By booking reference
- Search results show:
  - Name
  - Contact info
  - Last visit date
  - Total bookings
  - Customer tier (if applicable)
- Customer profile view:
  - Full contact information
  - Complete booking history
  - Customer stats (lifetime value, visit frequency)
  - Internal staff notes
  - Customer preferences
- Actions available:
  - Create booking for customer
  - Edit customer profile
  - View detailed history
  - Send email/SMS
  - Add internal notes

**Acceptance Criteria:**
- Search returns results in under 1 second
- Partial name matching works
- Phone search works with various formats
- Easy to distinguish similar names

---

#### 2.5 Calendar & Schedule View

**Dedicated page:** `/staff/calendar`. All "Calendar" links from dashboard and nav go here. Immersive subpage (full-bleed gradient header, Back to Dashboard, user block per §2.0).

**Requirements:**
- Month grid view with selectable day; side panel shows selected day's bookings (detail list).
- Optional views: daily (default for panel), weekly, monthly overview.
- Grid layout (where applicable): lanes as rows, time as columns, bookings as colored blocks. Each booking: customer name, number of bowlers, special indicators (party, VIP, etc.). Color coding: confirmed, checked-in, lane blocks, available.
- Click booking to view/edit (modal or panel). Filter options: all bookings, walk-ins only, online only, by staff. Print view for daily schedule.

**Acceptance Criteria:**
- Calendar at `/staff/calendar`; loads quickly (< 2 seconds). Easy to scan; color-blind friendly; touch/click smooth; print-friendly.

---

#### 2.6 Check-In System

**Requirements:**
- Quick check-in methods:
  - Search by name
  - Search by phone
  - Search by booking reference
  - Scan QR code (from confirmation)
- Show upcoming bookings for customer
- One-click check-in button
- Automatic status change (confirmed → checked in)
- Display lane assignment
- Option to print lane card
- "Running late" option (notify staff)
- Mark as no-show if needed

**Acceptance Criteria:**
- Check-in takes under 10 seconds
- QR code scan works reliably
- Clear lane assignment shown
- Staff notified of check-in

---

#### 2.7 Staff Settings Information Architecture (10.x)

**Context:** When staff open Settings, they see an immersive subpage (full-bleed gradient header, Back to Dashboard, user block). Main top nav is hidden. Sign-out is a red button at the bottom of the settings sidebar only (see §2.0).

**Core Settings Screens (single list; no "Advanced" group):**
- **10.1 Account Information**
  - Displays staff profile identity, role, contact details, and account creation metadata
  - Readable by all authenticated staff roles; editable fields (e.g. name, email, phone) with "Save Changes"
- **10.2 User Management**
  - Lists employee accounts and their assigned roles (read-only table)
  - Edit opens modal: name, email, phone, role; CTAs: Delete (tertiary/red text), Cancel, Save Changes. Add User in page header (Admin-only create)
  - Role edits and delete restricted to Admin; Staff and Manager have read-only visibility
- **10.3 Integrations**
  - Shows external service connection status (payments, messaging, marketing, exports)
  - Includes configuration entry points gated by role and environment readiness
- **10.4 Operating Hours**
  - Day-by-day open/close controls with closed-day support
  - Editable for Manager/Admin, read-only for Staff
- **10.5 Lanes**
  - Controls total lane inventory and lane reserve buffer used by availability logic
  - Editable for Manager/Admin, read-only for Staff
- **10.6 Pricing**
  - Configures lane, bowler, shoe, and tax pricing values for booking totals
  - Editable for Manager/Admin, read-only for Staff
- **10.7 Blackout Dates**
  - Manages lane blocks by date/time and lane selection
  - Editable for Manager/Admin, read-only for Staff
- **10.8 Packages**
  - Lists and routes to package management workflows (view, create, edit); create/edit use route-intercept modals
  - Editable for Manager/Admin, read-only visibility for Staff

**Acceptance Criteria:**
- Settings nav is a single list 10.1–10.8; no Advanced section
- Sign-out appears only at bottom of settings sidebar (red)
- All staff roles can view settings pages they are authorized to access
- Manager/Admin can save allowed configuration; read-only users never see write access applied server-side

---

### 3. Manager Features

#### 3.1 Booking Overrides

**Price Override:**
**Requirements:**
- View original pricing
- Input new price (or percentage discount)
- Reason code selection (required):
  - Customer complaint/service recovery
  - Loyalty reward
  - Special promotion
  - Manager discretion
  - Price match
  - Group discount
  - Other
- Free-text notes field
- Before/after comparison
- Manager authentication (re-enter password)
- Confirmation dialog

**Acceptance Criteria:**
- Original price always visible
- Cannot proceed without reason
- All overrides logged with timestamp
- Audit trail includes manager ID

---

**Edit Booking:**
**Requirements:**
- Modify any booking field:
  - Date and time (even if "full")
  - Number of lanes
  - Number of bowlers
  - Duration
  - Add/remove packages
  - Add/remove add-ons
- Price recalculates automatically
- Option to override recalculated price
- Reason required for major changes
- Customer notification option
- Show modification history

**Acceptance Criteria:**
- Changes saved immediately
- Customer notified if selected
- Modification history visible
- Cannot break data integrity

---

**Cancellation & Refunds:**
**Requirements:**
- Cancel booking (any status)
- Refund options:
  - Full refund
  - Partial refund (specify amount)
  - No refund (waive cancellation fee)
  - Store credit instead
- Refund reason (required)
- Process immediately or schedule
- Refund method:
  - Original payment method
  - Cash (in-person)
  - Store credit
- Customer notification
- Cancellation confirmation

**Acceptance Criteria:**
- Refund processed correctly
- Customer receives confirmation
- Refund appears in payment provider
- Logged in audit trail

---

**Override Lane Blocks:**
**Requirements:**
- View blocked lanes for selected time
- See block details (reason, priority)
- Override option if block allows it
- Reason required for override
- Notes field for context
- Warning if high-priority block
- Cannot override if block prohibits
- Contact info shown for block owner
- Confirmation required

**Acceptance Criteria:**
- Clear warning before override
- Block owner can be notified
- Override logged with reason
- Original block unchanged

---

#### 3.2 Lane Blocking Management

**Create One-Time Block:**
**Requirements:**
- Block name/title
- Select date
- Select time range (start/end)
- Select lanes to block:
  - Individual lane checkboxes
  - "Select all" option
  - Visual lane selector
- Block reason (dropdown):
  - League
  - Maintenance
  - Private Event
  - Tournament
  - Other
- Description/notes
- Contact person and phone
- Allow manager override? (checkbox)
- Priority level (high/medium/low)

**Acceptance Criteria:**
- Easy lane selection
- Validation prevents conflicts
- Block immediately active
- Visible in calendar view

---

**Create Recurring Block:**
**Requirements:**
- All fields from one-time block, plus:
- Recurrence pattern:
  - Weekly
  - Bi-weekly
  - Monthly
- Day(s) of week selection:
  - Multi-select checkboxes
  - Example: every Tuesday and Thursday
- Start date (when pattern begins)
- End date (optional, leave blank for ongoing)
- Time range (same for all occurrences)
- Lanes (same for all occurrences)
- Preview of upcoming occurrences

**Acceptance Criteria:**
- Pattern generates correctly
- Preview shows accurate dates
- End date validation
- Can edit pattern after creation

---

**Edit Recurring Block:**
**Requirements:**
- When editing, prompt for scope:
  - This occurrence only
  - This and all future occurrences
  - All occurrences
- Edit fields based on scope
- Confirmation of scope impact
- Show affected dates

**Acceptance Criteria:**
- Scope selection clear
- Changes apply correctly
- No unintended modifications
- Audit trail shows scope

---

**Cancel Occurrence:**
**Requirements:**
- Select specific occurrence to cancel
- Reason field
- Confirmation
- Lanes become available for that date
- Recurring pattern continues otherwise

**Acceptance Criteria:**
- Only selected date affected
- Lanes available immediately
- Cancellation logged

---

**View Active Blocks:**
**Requirements:**
- List view of all blocks:
  - Recurring blocks section
  - Upcoming one-time blocks
- Each block shows:
  - Name
  - Schedule/date
  - Lanes affected
  - Reason
- Actions: Edit, Delete, View Schedule
- Filter by:
  - Block type
  - Date range
  - Lane(s)
  - Reason

**Acceptance Criteria:**
- Easy to scan
- Clear grouping
- Quick access to edit
- Confirmation before delete

---

#### 3.3 Operating Hours Management

**Regular Hours Configuration:**
**Requirements:**
- Configure for each day of week:
  - Open time (or mark as closed)
  - Close time
  - Support for overnight (closes after midnight)
- Simple time picker inputs
- "Copy to all days" option
- "Closed" checkbox for days not open
- Preview of weekly schedule
- Save confirmation

**Acceptance Criteria:**
- Easy to configure
- Handles overnight correctly
- Changes apply to future bookings
- Current bookings unaffected

---

**Special Hours / Overrides:**
**Requirements:**
- Add special hours for specific date
- Override default hours for:
  - Holidays (closed)
  - Extended hours (special events)
  - Early close
  - Late open
- Fields:
  - Date
  - Open time (or closed checkbox)
  - Close time
  - Reason/description
- List of upcoming special hours
- Edit/delete special hours
- Warning if conflicts with bookings

**Acceptance Criteria:**
- Special hours override defaults
- Customers see correct hours
- Warning if bookings exist outside new hours
- Special hours priority clear

---

#### 3.4 Reports & Analytics

**Single reports experience:** One canonical page at `/staff/reports`. Path `/staff/analytics` redirects to `/staff/reports`. Immersive subpage (full-bleed gradient header, Back to Dashboard, user block per §2.0).

**Requirements:**
- Tabs: **Analytics** (default), **Contacts**. Date range pills (Today, This Week, This Month, This Year, Custom Range) and **Export Report** button in the same control row (right-aligned; label does not wrap).
- **Analytics tab:**
  - KPI cards (smaller type): total revenue, bookings, etc. for selected range.
  - **Quick Metrics:** icon-led rows (e.g. Average Party Size, Lane Utilization, Peak Hours) with bordered rows.
  - **Top Packages:** ranked rows with number badges (1–4), package name, booking count, revenue.
  - **Daily Revenue** and **Daily Bookings:** bar chart sections with Y-axis labels and horizontal grid; section titles reflect range (e.g. "Daily Revenue (This Week)").
- **Contacts tab:** customer/contact list and export as needed.
- Optional: revenue trend (line), bookings by day/slot, package popularity, customer segments.

**Acceptance Criteria:**
- Single URL for reports; analytics redirects to it. Export in control row; no wrap.
- Interactive charts; export to PDF/CSV. Fast loading (< 3 seconds); mobile-responsive.

---

**Booking Reports:**
**Requirements:**
- Filters:
  - Date range
  - Booking status
  - Created by (customer vs. staff)
  - Customer tier
  - Package type
- Columns (customizable):
  - Booking reference
  - Customer name
  - Date and time
  - Lanes
  - Revenue
  - Status
  - Created by
- Export options:
  - CSV
  - Excel
  - PDF
- Sort and search

**Acceptance Criteria:**
- Fast filtering (< 1 second)
- Export preserves formatting
- All data accurate
- Handles large datasets

---

**Customer Reports:**
**Requirements:**
- Customer list with:
  - Name and contact
  - Total bookings
  - Last visit
  - Lifetime value
  - Customer tier
- Sort and filter options
- Segmentation:
  - VIP customers
  - Regular customers
  - New customers (first booking < 30 days)
  - Lapsed customers (no booking in 90+ days)
- Export to CSV
- Opt-in status visible

**Acceptance Criteria:**
- Fast searching
- Accurate calculations
- Privacy-compliant exports
- Segmentation logic correct

---

**Audit Log Report:**
**Requirements:**
- Filter by:
  - Date range
  - Staff member
  - Action type (override, refund, edit, etc.)
  - Entity (booking, customer, package)
- Show:
  - Timestamp
  - Staff member
  - Action
  - Entity affected
  - Reason
  - Before/after values
- Search functionality
- Export to CSV
- Cannot modify or delete logs

**Acceptance Criteria:**
- Complete audit trail
- Immutable logs
- Fast searching
- Detailed information

---

### 4. Package Management System

#### 4.1 Package Structure

**Required Fields:**
- Package name (max 100 characters)
- Description (max 500 characters, rich text)
- Package type (dropdown):
  - Party Package
  - Food Package
  - Arcade Package
  - Combo Package
- Package image (upload):
  - Max 2MB
  - Formats: JPG, PNG, WebP
  - Recommended size: 800x600px
- Base price (currency input)
- Duration (if time-based):
  - Dropdown: 1, 1.5, 2, 2.5, 3 hours, or custom
  - Can be null for non-time packages
- Lanes included (integer, min 0)
- Base guest count (integer, required)
- Maximum guest capacity (integer, >= base)
- Price per additional guest (currency)
- Allow additional lanes (checkbox)
- Price per additional lane (currency)
- Max additional lanes (integer)
- Active status (toggle)
- Featured package (checkbox)
- Display order (integer for sorting)

**Acceptance Criteria:**
- All required fields enforced
- Image upload with preview
- Price validation (positive numbers)
- Guest capacity validation (max >= base)
- Save creates audit log entry

---

#### 4.2 Package Display & Selection

**Browse Packages:**
**Requirements:**
- Grid layout with package cards
- Each card shows:
  - Image (prominent)
  - Name
  - Base price
  - Duration badge (if applicable)
  - Guest capacity ("Serves X guests")
  - Lanes included ("Includes X lanes")
  - Brief description (truncated)
- Filter by package type
- Sort options:
  - Price (low to high, high to low)
  - Popularity
  - Newest
- "View Details" expands full information
- Mobile-responsive grid

**Acceptance Criteria:**
- Fast loading with image optimization
- Clear visual hierarchy
- Easy to compare packages
- Touch-friendly on mobile

---

**Package Details:**
**Requirements:**
- Full-screen or modal view
- Large image
- Complete description
- "What's Included" list with icons
- Pricing breakdown:
  - Base price and what's included
  - Additional guest pricing
  - Additional lane pricing
- Customization options:
  - Additional guests selector (+/- or slider)
  - Additional lanes checkbox
  - Real-time price calculation
- "Add to Booking" button
- Close/back button

**Acceptance Criteria:**
- All information clearly presented
- Price updates instantly
- Validation prevents errors
- Easy to customize

---

#### 4.3 Multiple Packages in Cart

**Requirements:**
- Shopping cart/basket functionality
- Add multiple packages to one booking:
  - Same package multiple times
  - Different packages in combination
- Cart displays:
  - Each package separately
  - Package name and customization
  - Individual price
  - Edit button (per package)
  - Remove button (per package)
- Cart summary:
  - Total lanes required
  - Total duration (must match for all)
  - Total guests
  - Subtotal, tax, total
- "Add Another Package" button
- "Continue to Checkout" button
- Empty cart message if no packages
- Validation:
  - Duration compatibility check
  - Venue capacity check
  - Available lanes check

**Acceptance Criteria:**
- Each package independently editable
- Price calculations accurate
- Duration mismatch prevented
- Clear error messages
- Cart persists during session

---

### 5. Database & Data Management

#### 5.1 Database Technology

**Recommended: PostgreSQL**
- Hosted on managed service (AWS RDS, Supabase, etc.)
- Automated daily backups
- Point-in-time recovery
- SSL/TLS encryption in transit
- Encryption at rest
- Scalable for growth

**Core Tables:**
1. users (customers and staff)
2. customer_profiles
3. staff_profiles
4. bookings
5. booking_packages
6. packages
7. shoe_rentals
8. operating_hours
9. special_hours
10. lane_blocks
11. audit_logs
12. payment_transactions
13. sessions

(See Appendix A for complete schema)

---

#### 5.2 Data Security

**Password Security:**
- Bcrypt hashing (cost factor 12+)
- Salted automatically
- Never store plain text
- Never display to staff
- Minimum password requirements enforced

**Session Management:**
- Secure session tokens (UUID v4)
- HTTP-only cookies
- Secure flag (HTTPS only)
- SameSite flag (prevent CSRF)
- 30-day idle timeout
- 90-day absolute timeout
- Invalidate on password change

**Data Encryption:**
- TLS/HTTPS for all connections
- Encrypt sensitive data at rest
- Payment provider handles card data (never stored)
- Secure storage of API keys (environment variables)

**Access Control:**
- Role-based permissions
- Customers access own data only
- Staff actions logged
- Manager overrides logged
- Admin actions logged
- Principle of least privilege

---

#### 5.3 Data Privacy & Compliance

**GDPR/CCPA Requirements:**
- Clear privacy policy
- Explicit consent for marketing
- Right to access data (customer portal)
- Right to rectification (profile editing)
- Right to erasure (account deletion)
- Right to data portability (CSV export)
- Right to opt-out

**Data Retention:**
- Active bookings: Indefinite
- Completed bookings: 7 years (tax/legal)
- Cancelled bookings: 7 years
- Deleted accounts: Soft delete, anonymize after 30 days
- Audit logs: 7 years (immutable)
- Session data: Auto-delete after expiration

**Customer Rights:**
- View all their data
- Edit their information
- Download their data (JSON/CSV)
- Delete their account
- Opt out of marketing
- Receive data breach notifications (if applicable)

---

### 6. Payment Processing

#### 6.1 Payment Provider Integration

**Recommended: Stripe**
**Alternative: Square**

**Why Stripe:**
- Excellent API and documentation
- PCI compliance handled
- Support for many payment methods
- Apple Pay and Google Pay support
- Subscription billing (for future features)
- Strong fraud detection
- Competitive pricing (2.9% + $0.30 per transaction)

**Integration Requirements:**
- Never store credit card numbers
- Use Stripe's hosted checkout or Stripe Elements
- Store only Stripe customer ID and payment method ID
- Webhooks for payment confirmations
- Handle failed payments gracefully
- Support for refunds through API

---

#### 6.2 Payment Flows

**Online Booking Payment:**
1. Customer completes booking details
2. Reviews total price
3. Chooses payment option:
   - Pay full amount now
   - Pay deposit (e.g., 25% or $50 minimum)
4. Redirected to Stripe checkout (or embedded)
5. Completes payment securely
6. Webhook confirms payment to our system
7. Booking status updated to "paid" or "deposit paid"
8. Confirmation email sent with receipt
9. Return to confirmation page

**Staff-Created Booking Payment:**
- Option 1: Process payment now (card present/phone)
  - Staff uses payment terminal or enters card
  - Processes through Stripe
  - Receipt printed for customer
- Option 2: Mark as "pay on arrival"
  - Customer pays when checking in
  - Can pay via card, cash, or other method
  - Staff marks as paid in system
- Option 3: Manager discount/comp
  - Partial or full discount applied
  - Reason required
  - Logged in audit trail

**Refund Processing:**
- Manager initiates refund in system
- Selects full or partial amount
- Reason required
- Processes immediately through Stripe API
- Customer receives refund confirmation
- Refund appears on original payment method in 5-10 days
- Transaction logged

---

### 7. Marketing & Customer Data

#### 7.1 Customer Data Unification

**Goal:** Single customer record across all bowling alley services

**Unified Customer Profile:**
- Customer ID links all touchpoints:
  - Bowling reservations
  - Arcade card purchases
  - Food/beverage orders
  - Pro shop purchases (if integrated)
  - League participation (if integrated)
- Import existing customer data from other systems
- Merge duplicate accounts
- Comprehensive activity history

**Customer 360 View (Staff):**
- All customer interactions in one place
- Lifetime value calculations
- Visit frequency and recency
- Preferred times/days
- Favorite packages and add-ons
- Total spending by category

---

#### 7.2 Customer Segmentation

**Automated Segments:**
- **New Customers:** First booking within 30 days
- **Regular Customers:** 3+ bookings in last 90 days
- **VIP Customers:** High lifetime value ($500+)
- **Lapsed Customers:** No booking in 90+ days
- **Party Hosts:** Booked party package in last year
- **Weekend Bowlers:** 80%+ bookings on Fri-Sun
- **Arcade Fans:** Purchased arcade cards

**Custom Segments:**
- Filter by any combination:
  - Booking frequency
  - Last visit date
  - Spending levels
  - Preferred times
  - Add-on preferences
  - Demographics (if collected)
  - Marketing opt-in status

---

#### 7.3 Export & Sync

**CSV Export:**
**Requirements:**
- Select customer segment
- Choose columns to export:
  - Basic info (name, email, phone)
  - Booking statistics
  - Lifetime value
  - Last visit date
  - Opt-in status
  - Custom fields
- Pre-built templates for common exports
- Date range filters
- One-click download
- Privacy compliance (only export opted-in for marketing)

**Acceptance Criteria:**
- Fast export (< 10 seconds for 10,000 records)
- Proper CSV formatting
- Respects opt-in preferences
- Audit log entry created

---

**Contact Sync:**
**Requirements:**
- Automatic sync to external platforms
- Supported platforms:
  - Mailchimp (direct API integration)
  - Klaviyo (direct API integration)
  - Generic webhook (for custom CRM or Zapier)
- Sync options:
  - Real-time (as customers are created/updated)
  - Scheduled (hourly, daily)
  - Manual (on-demand)
- Configurable field mapping
- Sync only customers with marketing opt-in
- Two-way sync for opt-outs
- Sync activity logs
- Error handling and retry logic

**Acceptance Criteria:**
- New customers appear in marketing platform within 1 hour (or real-time)
- Opt-outs respected immediately
- Failed syncs logged and retried
- Sync status visible to admin

---

### 8. Security Requirements

#### 8.1 Authentication Security

- **Password Requirements:** 8+ chars, uppercase, lowercase, number
- **Password Hashing:** Bcrypt with salt (cost 12+)
- **Failed Login Protection:** Lock after 5 attempts for 30 minutes
- **Session Security:** Secure, HTTP-only, SameSite cookies
- **Session Timeout:** 30 days idle, 90 days absolute
- **Password Reset:** Token-based, 1-hour expiration
- **Email Verification:** Required for new accounts
- **Two-Factor Auth:** Future enhancement

---

#### 8.2 Application Security

- **HTTPS/TLS:** Enforced for all connections
- **SQL Injection Prevention:** Parameterized queries/ORM
- **XSS Prevention:** Output escaping, CSP headers
- **CSRF Protection:** CSRF tokens on all forms
- **Rate Limiting:** 100 requests/minute per user
- **Input Validation:** Frontend and backend validation
- **Security Headers:** 
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security
- **Dependency Scanning:** Regular updates and vulnerability checks
- **Error Handling:** Generic error messages (don't leak system info)

---

#### 8.3 Payment Security

- **PCI DSS Compliance:** Via Stripe/Square (no card data stored)
- **Tokenization:** Use payment provider's tokens only
- **Secure Communication:** All payment API calls over HTTPS
- **Webhook Verification:** Verify Stripe webhook signatures
- **No Card Storage:** Never store card numbers or CVV
- **Payment Logs:** Secure logging without sensitive data

---

#### 8.4 Data Security

- **Encryption at Rest:** Database encryption enabled
- **Encryption in Transit:** TLS 1.3 minimum
- **Backup Encryption:** Encrypted backups
- **API Key Security:** Environment variables, never committed to code
- **Access Logs:** Monitor and alert on suspicious access
- **Regular Backups:** Daily automated, tested monthly
- **Disaster Recovery Plan:** Documented and tested

---

#### 8.5 Audit & Compliance

- **Audit Logging:** All sensitive actions logged
  - Customer data access by staff
  - Price overrides
  - Refunds
  - Profile changes
  - Permission changes
- **Immutable Logs:** Cannot be modified or deleted
- **Log Retention:** 7 years
- **Privacy Policy:** Clear, accessible
- **Terms of Service:** Clear, accessible
- **GDPR Compliance:** Data rights, consent management
- **Regular Security Reviews:** Quarterly
- **Penetration Testing:** Before launch, then annually

---

## MVP Scope

### Phase 1: Core MVP (Months 1-3)

**Must-Have Features:**

**Customer Features:**
- ✅ User registration and login
- ✅ Browse available times (calendar view)
- ✅ Book single lane for specific time
- ✅ Add bowlers and shoe sizes
- ✅ Select from 3-4 food/drink packages
- ✅ Select from 2-3 party packages
- ✅ Multiple packages in one booking
- ✅ Stripe payment integration
- ✅ Email confirmation
- ✅ View upcoming bookings
- ✅ Cancel own bookings
- ✅ Basic profile editing
- ✅ Booking history

**Staff Features:**
- ✅ Staff login (separate from customer)
- ✅ Create bookings for walk-ins
- ✅ Customer search (name, phone, email)
- ✅ View all bookings (calendar view)
- ✅ Check in customers
- ✅ Mark payment as received

**Manager Features:**
- ✅ Price overrides with reason codes
- ✅ Edit bookings
- ✅ Process refunds
- ✅ Create one-time lane blocks
- ✅ Create recurring lane blocks
- ✅ Configure operating hours
- ✅ Basic reports (bookings, revenue)

**Admin Features:**
- ✅ Create/edit packages
- ✅ Manage staff accounts
- ✅ Configure system settings
- ✅ CSV export of customer data

**Infrastructure:**
- ✅ PostgreSQL database (managed service)
- ✅ Secure authentication system
- ✅ Payment processing (Stripe)
- ✅ Email service
- ✅ HTTPS/SSL
- ✅ Basic security measures
- ✅ Automated backups

**Out of Scope for MVP:**
- Wait list functionality
- SMS notifications
- Customer self-service booking modifications
- Multiple lane booking (single lane only for MVP)
- Arcade card purchases in booking
- Advanced analytics dashboard
- Marketing platform integrations (CSV export only)
- Mobile app (responsive web only)

---

### Phase 2: Enhanced Features (Months 4-6)

**Add:**
- Multiple lane booking
- Wait list with automatic notifications
- SMS reminders (via Twilio)
- Customer self-service booking modifications
- Arcade card add-on during booking
- Individual food/drink item selection
- Enhanced reporting and analytics
- Manager approval workflows
- Customer tier system (VIP, Regular, etc.)
- Mailchimp direct integration

---

### Phase 3: Advanced Features (Months 7-12)

**Add:**
- Two-factor authentication
- Mobile app (iOS/Android)
- Advanced marketing automation
- Loyalty program
- Gift cards
- API for third-party integrations
- Integration with existing lane management system
- Integration with POS system
- Self-service check-in kiosks
- Advanced analytics with AI insights

---

## Future Enhancements

### Long-Term Roadmap

**Year 2 Features:**
- League management module
- Tournament bracket system
- Equipment rental tracking (bowling balls, etc.)
- Inventory management for pro shop
- Employee scheduling module
- Advanced CRM features
- Customer mobile app with push notifications
- Social features (share scores, challenge friends)
- Gamification (badges, achievements)

**Integrations:**
- QuickBooks/Xero for accounting
- Square/Clover POS integration
- Google/Facebook advertising pixels
- Social media booking widgets
- Calendar integrations (Google Calendar, iCal)
- Slack notifications for staff

**Advanced Analytics:**
- Predictive analytics (forecast busy times)
- Dynamic pricing based on demand
- Churn prediction
- Customer lifetime value prediction
- A/B testing framework
- Cohort analysis

---

## Success Metrics

### Launch Success (First 3 Months)

**Adoption Goals:**
- 40% of bookings made online (vs. phone/walk-in)
- 500+ customer accounts created
- 70% mobile booking rate
- < 5% booking abandonment rate

**Operational Goals:**
- Phone call volume reduced by 40%
- Average booking time (staff): under 90 seconds
- Average booking time (customer): under 3 minutes
- Staff satisfaction increase: +20%

**Financial Goals:**
- 15% increase in total bookings
- 10% increase in average booking value (package attachment)
- 25% reduction in no-show rate
- Capture 50+ bookings during closed hours (per month)

**Technical Goals:**
- 99.9% uptime
- Average page load under 2 seconds
- Zero data breaches or security incidents
- Zero payment processing errors

---

### Year 1 Success (12 Months)

**Adoption Goals:**
- 60%+ of bookings made online
- 2,000+ customer accounts
- 60% repeat booking rate
- 50% of customers use mobile

**Operational Goals:**
- Phone call volume reduced by 60%
- Staff time spent on bookings: < 20% (from 50%+)
- Customer satisfaction score: 4.5/5 or higher

**Financial Goals:**
- 25% increase in total bookings
- 15% increase in average booking value
- 50% reduction in no-show rate
- 20% increase in off-peak bookings
- $X additional revenue from online bookings during closed hours

**Marketing Goals:**
- 5,000+ customers in database with marketing opt-in
- 25% email open rate
- 5% conversion rate on email campaigns
- Successfully re-engage 30% of lapsed customers

---

## Implementation Timeline

### Pre-Development (Month 0)

**Week 1-2: Planning & Requirements**
- [ ] Family review and approval of PRD
- [ ] Identify current systems in use
- [ ] Choose payment processor (Stripe recommended)
- [ ] Choose database hosting (AWS RDS/Supabase)
- [ ] Choose development approach (custom build vs. platform)
- [ ] Budget finalization
- [ ] Timeline agreement

**Week 3-4: Design & Preparation**
- [ ] Create Figma designs (see Design Guide)
- [ ] Design system (colors, typography, components)
- [ ] Customer booking flow mockups
- [ ] Staff interface mockups
- [ ] User testing with family/staff
- [ ] Refine designs based on feedback
- [ ] Set up development environment
- [ ] Purchase domain name and SSL certificate
- [ ] Set up hosting infrastructure

---

### Development - Phase 1 MVP (Months 1-3)

**Month 1: Foundation**
**Weeks 1-2:**
- [ ] Database schema creation
- [ ] User authentication system
- [ ] Customer registration and login
- [ ] Staff login system
- [ ] Basic customer dashboard
- [ ] Basic staff dashboard

**Weeks 3-4:**
- [ ] Operating hours configuration (admin)
- [ ] Lane blocking system (one-time and recurring)
- [ ] Availability calculation engine
- [ ] Calendar view (customer-facing)
- [ ] Calendar view (staff-facing)

---

**Month 2: Core Booking**
**Weeks 5-6:**
- [ ] Customer booking flow (Steps 1-2: date/time, details)
- [ ] Shoe rental selection
- [ ] Package system (database and admin UI)
- [ ] Package display and selection (customer)
- [ ] Multiple package cart functionality
- [ ] Package customization (guests, lanes)

**Weeks 7-8:**
- [ ] Booking review and confirmation
- [ ] Stripe payment integration
- [ ] Payment processing (customer bookings)
- [ ] Email confirmation system
- [ ] Booking confirmation page
- [ ] Customer booking management (view, cancel)

---

**Month 3: Staff Tools & Polish**
**Weeks 9-10:**
- [ ] Staff create booking functionality
- [ ] Customer search and profile view
- [ ] Check-in system
- [ ] Mark payment as received
- [ ] Manager price override system
- [ ] Manager edit booking functionality
- [ ] Refund processing

**Weeks 11-12:**
- [ ] Basic reporting (bookings, revenue)
- [ ] Audit logging system
- [ ] CSV customer export
- [ ] Security hardening
- [ ] Bug fixing and optimization
- [ ] User acceptance testing with staff
- [ ] Staff training sessions
- [ ] Documentation (user guides)

---

### Testing & Launch (Month 4)

**Week 13: Testing**
- [ ] Comprehensive testing (all features)
- [ ] Security testing
- [ ] Performance testing
- [ ] Browser/device testing
- [ ] Payment processing testing (test mode)
- [ ] Email delivery testing
- [ ] Bug fixes

**Week 14: Soft Launch**
- [ ] Enable for family/friends only
- [ ] Limited promotion (email to existing customers)
- [ ] Monitor closely for issues
- [ ] Gather feedback
- [ ] Quick fixes as needed
- [ ] Staff using system alongside old system

**Week 15: Optimization**
- [ ] Address feedback from soft launch
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Additional staff training
- [ ] Prepare marketing materials

**Week 16: Full Launch**
- [ ] Public announcement
- [ ] Social media promotion
- [ ] Signage in bowling alley
- [ ] Email to all customers
- [ ] Staff fully transitioned to new system
- [ ] Monitor performance and bookings
- [ ] Celebrate!

---

### Post-Launch (Months 5-6)

**Month 5: Stabilization**
- [ ] Monitor system performance
- [ ] Fix any issues quickly
- [ ] Gather customer feedback (surveys)
- [ ] Gather staff feedback
- [ ] Analyze usage data
- [ ] Identify improvement opportunities
- [ ] Plan Phase 2 features

**Month 6: Optimization & Phase 2 Planning**
- [ ] Performance optimizations
- [ ] UI/UX improvements based on feedback
- [ ] Additional reports as requested
- [ ] Begin Phase 2 development
- [ ] Prioritize features for Phase 2
- [ ] Update documentation

---

## Technical Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────┐
│         Frontend (Browser)              │
│  React or HTML/CSS/JavaScript           │
│  - Customer Portal                      │
│  - Staff Portal                         │
└──────────────┬──────────────────────────┘
               │ HTTPS/REST API
┌──────────────▼──────────────────────────┐
│     Backend API Server                  │
│  Node.js / Python / PHP                 │
│  - Authentication                       │
│  - Business Logic                       │
│  - API Endpoints                        │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐ ┌─────▼──────┐
│  Database   │ │  Payment   │
│ PostgreSQL  │ │  Provider  │
│             │ │  (Stripe)  │
└─────────────┘ └────────────┘
```

### Technology Stack Recommendations

**Frontend:**
- **Framework:** React (for dynamic UI) or vanilla JavaScript (simpler)
- **Styling:** Tailwind CSS or Bootstrap
- **State Management:** React Context or Redux (if React)
- **Form Handling:** React Hook Form or Formik
- **Date/Time:** date-fns or Day.js
- **HTTP Client:** Axios or Fetch API

**Backend:**
- **Language:** Node.js (JavaScript/TypeScript) - Recommended
  - OR Python (Django/Flask)
  - OR PHP (Laravel)
- **Framework:** Express.js (Node), Django REST (Python), Laravel (PHP)
- **Authentication:** Passport.js, JWT, or session-based
- **Validation:** Joi, express-validator, or similar
- **Email:** SendGrid, Mailgun, or AWS SES

**Database:**
- **Database:** PostgreSQL (recommended)
- **ORM:** Prisma (Node), SQLAlchemy (Python), Eloquent (PHP)
- **Migrations:** Built into ORM
- **Hosting:** AWS RDS, Google Cloud SQL, or Supabase

**Infrastructure:**
- **Hosting:** AWS, Google Cloud, or Vercel/Netlify (frontend)
- **CDN:** CloudFlare (for images and assets)
- **SSL:** Let's Encrypt (free) or CloudFlare
- **Monitoring:** Sentry (errors), Google Analytics (usage)
- **Backups:** Automated via hosting provider

**Payment:**
- **Provider:** Stripe (recommended) or Square
- **SDK:** Official Stripe SDK for chosen language

**Email:**
- **Service:** SendGrid (recommended), Mailgun, or AWS SES
- **Templates:** HTML email templates

---

### API Endpoints Overview

**Authentication:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/verify-email

**Customers:**
- GET /api/customers/me
- PUT /api/customers/me
- PUT /api/customers/me/password
- GET /api/customers/me/bookings
- DELETE /api/customers/me

**Bookings:**
- GET /api/availability (check available times/lanes)
- POST /api/bookings (create)
- GET /api/bookings/:id (view)
- PUT /api/bookings/:id (modify)
- DELETE /api/bookings/:id (cancel)

**Packages:**
- GET /api/packages (list all active)
- GET /api/packages/:id (details)

**Staff:**
- GET /api/staff/customers (search)
- GET /api/staff/customers/:id (view)
- PUT /api/staff/customers/:id (edit)
- POST /api/staff/bookings (create for customer)
- GET /api/staff/bookings (all bookings)
- POST /api/staff/check-in/:booking_id

**Manager:**
- POST /api/manager/override-price
- POST /api/manager/refund
- POST /api/manager/lane-blocks (create)
- PUT /api/manager/lane-blocks/:id (edit)
- DELETE /api/manager/lane-blocks/:id
- GET /api/manager/audit-logs

**Admin:**
- POST /api/admin/packages (create)
- PUT /api/admin/packages/:id (edit)
- POST /api/admin/staff (create staff account)
- PUT /api/admin/operating-hours
- GET /api/admin/reports/bookings
- GET /api/admin/reports/customers
- POST /api/admin/export/customers

---

## Appendices

### Appendix A: Complete Database Schema

See "Database & Account Management - Technical Specifications" document for complete schema with all tables, fields, indexes, and relationships.

**Core Tables:**
1. users
2. customer_profiles
3. staff_profiles
4. bookings
5. booking_packages
6. packages
7. shoe_rentals
8. operating_hours
9. special_hours
10. lane_blocks
11. audit_logs
12. payment_transactions
13. sessions

---

### Appendix B: Package Structure Specifications

See "Add-On Package Structure - Detailed Specifications" document for complete package system details including:
- Package data model
- Customization options (guests, lanes)
- Pricing calculations
- Multiple packages in cart
- Manager overrides
- UI/UX requirements

---

### Appendix C: Lane Blocking & Hours Specifications

See "Lane Blocking & Operating Hours - Technical Specifications" document for complete details on:
- Operating hours configuration
- Special hours/overrides
- One-time lane blocks
- Recurring lane blocks
- Availability calculation logic
- Staff interfaces

---

### Appendix D: Design Guide

See "Figma Design Guide - Bowling Reservation System" document for:
- Design system (colors, typography)
- Screen-by-screen mockup specifications
- Prototyping instructions
- User flow diagrams
- Mobile responsive considerations

---

### Appendix E: Family-Friendly Overview

See "Bowling Alley Online Reservation System - Project Plan" document for:
- Non-technical explanation of the system
- Business benefits
- Customer journey examples
- Change management for staff
- Discussion questions for family meeting

---

## Glossary

**API (Application Programming Interface):** The way different software systems talk to each other

**Audit Log:** A record of who did what and when (for accountability)

**Authentication:** Verifying who someone is (login)

**Authorization:** Determining what someone is allowed to do (permissions)

**Bcrypt:** A secure method of storing passwords

**CSRF (Cross-Site Request Forgery):** A type of web attack (prevented by our security measures)

**Database:** Where all the data is stored (customers, bookings, etc.)

**GDPR:** European privacy law (we comply even though we're US-based)

**MVP (Minimum Viable Product):** The first basic version with essential features

**ORM (Object-Relational Mapping):** Software that makes database work easier

**PCI DSS:** Payment card security standards (handled by Stripe)

**PostgreSQL:** The database technology we'll use

**REST API:** A standard way to build web services

**Soft Delete:** Marking data as deleted without actually ereting it

**SQL Injection:** A type of attack on databases (prevented by our security)

**SSL/TLS:** Technology that keeps website connections secure (HTTPS)

**UUID:** A unique ID for database records

**XSS (Cross-Site Scripting):** A type of web attack (prevented by our security)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | [Your Name] | Initial PRD creation |
| 1.1 | February 2026 | — | Employee login state: §2.0 (unified internal UI, nav, sign-out, immersive subpages, dashboard/reports/calendar/settings). Aligned §2.2, §2.5, §2.7, §3.4. |

---

## Approval & Sign-Off

**Product Owner:** _________________ Date: _______

**Technical Lead:** _________________ Date: _______

**Manager/Owner:** _________________ Date: _______

---

**Next Steps:**
1. Review this PRD with family/stakeholders
2. Gather feedback and questions
3. Refine requirements based on feedback
4. Approve and sign off
5. Begin Figma design phase
6. Proceed to development

---

*This PRD is a living document and will be updated as requirements evolve during development.*