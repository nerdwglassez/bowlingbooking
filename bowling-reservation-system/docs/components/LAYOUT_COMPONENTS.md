# Layout component contracts

## Purpose

Define shared layout/header components that establish navigation chrome and user context across booking and staff/admin surfaces.

## Scope

- In scope: `components/layout/*` contracts and route usage mapping.
- Out of scope: page-specific body content and business logic.
- Linked docs: [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md), [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md).

## Component inventory and contract

| Component | Path | Contract summary |
|-----------|------|------------------|
| AppExperienceHeader | `components/layout/AppExperienceHeader.tsx` | Primary app chrome with `variant='booking' | 'staff'`, auth-aware navigation, and role-aware display behavior |
| StaffHeaderTitle | `components/layout/StaffHeaderTitle.tsx` | Contextual title content used inside staff/admin header |
| ImmersiveStaffPage | `components/layout/ImmersiveStaffPage.tsx` | Layout wrapper for immersive/fullscreen staff experiences |

## Behavioral invariants

- `AppExperienceHeader` with `variant="booking"`:
  - Signed-out: displays Login action and opens `AuthModal`.
  - Signed-in customer: displays customer identity, My Bookings, Profile, Log out.
  - Signed-in employee on booking surfaces: sends to account settings route, keeps logout available.
- `AppExperienceHeader` with `variant="staff"`:
  - Requires employee identity context (`STAFF`, `MANAGER`, `ADMIN`) and shows staff/admin navigation chrome.
  - Includes Settings action and employee identity block.
- Venue identity (`VENUE_NAME`, `VENUE_ADDRESS`) remains consistently rendered in header chrome.

## Route dependency map

| Route area | Layout/header dependency |
|------------|--------------------------|
| Customer booking and account surfaces (`/book`, `/bookings`, `/dashboard`, `/profile`, `/gift-cards`) | `AppExperienceHeader variant="booking"` |
| Staff area (`/staff/*`) | `AppExperienceHeader variant="staff"` with `StaffHeaderTitle` |
| Admin area (`/admin/*`) | `AppExperienceHeader variant="staff"` with admin-aware title state |
| Specialized subpages | Route-specific headers/components where compact user context is needed |

## Security and UX notes

- Header behavior must not be the only security gate; role checks remain server-side in layouts and APIs.
- Header role labels and profile/settings links should stay synchronized with actual authorization rules.
- Avoid exposing raw identifiers or secrets in header or user-summary UI.

## Change guidance

When changing layout/header behavior:

1. Update this file and relevant journey docs.
2. Validate both customer and employee role variants.
3. Confirm auth state transitions (login/logout) preserve expected routing.
