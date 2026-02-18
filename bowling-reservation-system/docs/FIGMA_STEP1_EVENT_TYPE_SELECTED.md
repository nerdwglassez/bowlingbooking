# Step 1 – Event Type Selected (Figma Design Pull)

Designs for **step1-event-type-selected** (mobile and desktop) pulled from Figma via MCP.

## Source

- **File:** Royal Z Various  
- **File key:** `iaGsm7JP6KloNQLxPtwXwQ`  
- **Figma URL:** `https://www.figma.com/design/iaGsm7JP6KloNQLxPtwXwQ/...`  
- **Canvas:** Booking Portal Refinements

## Frames Pulled

| Variant | Frame name | Node ID | Exported PNG |
|--------|-------------|---------|----------------|
| Desktop | `step1-desktop-event-type-selected` | `19:784` | `docs/figma-step1-event-type/step1-desktop-event-type-selected.png` (2682×2656) |
| Mobile  | `step1-mobile-event-type-selected`  | `23:955` | `docs/figma-step1-event-type/step1-mobile-event-type-selected.png` (802×4250) |

## Design Data

Full node data was fetched with:

- `get_figma_data(fileKey: "iaGsm7JP6KloNQLxPtwXwQ", nodeId: "19-784")` → desktop  
- `get_figma_data(fileKey: "iaGsm7JP6KloNQLxPtwXwQ", nodeId: "23-955")` → mobile  

Structure is the same as other Step 1 “date/time selected” screens, with the **BookingOptions** card in the **event-type-selected** state.

### Shared structure (both)

- **Heading:** “Reserve Your Lane”
- **Subtext:** “Select your preferred date and time to get started”
- **Progress:** 4-step indicator (first step filled)
- **DateTimeSelector:** Calendar + “Select a date” + time slots
- **BookingOptions** (event-type-selected state):
  - **Group size** label and controls
  - **“This is a party/event”** — selected/checked in this frame
  - **“Continue to details”** primary button

### Desktop (19:784)

- Body → BookingFlow → Container: heading, progress, DateTimeSelector card, BookingOptions card.
- Layout and styling align with `step1-desktop-time-selected`; difference is event-type toggle state and visible group-size/Continue block.

### Mobile (23:955)

- NavigationBar (ROYAL Z LANES BOOKING + Login).
- BookingFlow: same content as desktop in a single-column, scrollable layout.
- BookingOptions card includes Group size, “This is a party/event” (selected), and “Continue to details”.

## Local Assets

- **Desktop:** `bowling-reservation-system/docs/figma-step1-event-type/step1-desktop-event-type-selected.png`  
- **Mobile:** `bowling-reservation-system/docs/figma-step1-event-type/step1-mobile-event-type-selected.png`

Use these for layout reference and to confirm the “event type selected” state (party/event checked, group size and Continue visible).
