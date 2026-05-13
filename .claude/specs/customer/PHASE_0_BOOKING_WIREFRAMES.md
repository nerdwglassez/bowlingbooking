# Phase 0 — Booking wireframes source of truth

Wireframe sections **Step 1 (a–c)** and **Step 2 (a–d)** in `docs/wireframes/customer/booking-step1-2-branded.html` are **one logical user step (scheduling)** in two parts; **package selection** is the **third milestone** in the four-dot system but the **second full-screen chapter** in the user’s journey.

## Route ↔ wireframe (implementation map)

| App route | Progress dot (`StepIndicator`) | Primary customer HTML |
|-----------|-------------------------------|------------------------|
| `/book` | **1** — scheduling | `booking-step1-2-branded.html` — Step 1 variants **1a** (no date / time placeholder), **1b** (time + hold split: title/subtitle parity on `/book/time`) |
| `/book/time` | **1** — scheduling (same milestone as `/book`) | Same file — time grid + hold (**1b**); dots stay on first milestone until packages |
| `/book/package` | **2** — packages | `booking-step1-2-branded.html` Step 2 + `booking-step2-refined.html` |
| `/book/confirm` | **4** — checkout / payment | `booking-step4-confirmation.html` (dot 4 active in wireframe; milestone 3 has no dedicated URL — merged into confirm) |

## Notes

- **Milestone 3** in the four-dot wireframe has no standalone route in v1; navigating from package to confirm advances the indicator from **2 → 4** so dots **1–3** read complete and **4** active, matching the payment wireframe.
- Agent contract tables in `.claude/contracts/PAGES.md` should stay aligned with this file when wireframe filenames or IA change.
